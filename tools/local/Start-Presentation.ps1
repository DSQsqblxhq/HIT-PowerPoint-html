param(
    [ValidateRange(0, 65535)][int]$Port = $(if ($env:HIT_PRESENTATION_PORT) { $env:HIT_PRESENTATION_PORT } else { 8765 }),
    [string]$SelfPath = $env:HIT_PRESENTATION_SELF,
    [string]$BrowserPath = $env:HIT_PRESENTATION_BROWSER,
    [switch]$NoBrowser = ($env:HIT_PRESENTATION_NO_BROWSER -eq '1'),
    [string]$ReadyFile = $env:HIT_PRESENTATION_READY_FILE
)

$ErrorActionPreference = 'Stop'
if (-not $SelfPath) { throw '请双击生成的 HIT-HTML-local.cmd。' }
$SelfPath = (Resolve-Path -LiteralPath $SelfPath).Path
$onWindows = [Environment]::OSVersion.Platform -eq [PlatformID]::Win32NT
$launchBounds = $null
$launchSource = 0L
if ($onWindows) {
    # Snapshot the source Explorer window before browser startup changes focus.
    $sourceWindows = @()
    $shell = $null
    try {
        $shell = New-Object -ComObject Shell.Application
        foreach ($window in $shell.Windows()) {
            try {
                foreach ($item in $window.Document.SelectedItems()) {
                    if ($item.Path -ieq $SelfPath) { $sourceWindows += [long]$window.HWND; break }
                }
            } catch {}
        }
    } catch {} finally {
        if ($shell) { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($shell) }
    }
    Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
using System.Text;
public static class HitLaunchWindow {
    [StructLayout(LayoutKind.Sequential)] struct Point { public int X, Y; }
    [StructLayout(LayoutKind.Sequential)] struct Rect { public int Left, Top, Right, Bottom; }
    [StructLayout(LayoutKind.Sequential)] struct MonitorInfo { public int Size; public Rect Bounds, Work; public uint Flags; }
    delegate bool WindowCallback(IntPtr window, IntPtr data);
    [DllImport("user32.dll")] static extern bool EnumWindows(WindowCallback callback, IntPtr data);
    [DllImport("user32.dll")] static extern bool IsWindowVisible(IntPtr window);
    [DllImport("kernel32.dll")] static extern IntPtr GetConsoleWindow();
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowText(IntPtr window, StringBuilder text, int count);
    [DllImport("user32.dll")] static extern bool IsIconic(IntPtr window);
    [DllImport("user32.dll")] static extern bool IsZoomed(IntPtr window);
    [DllImport("user32.dll")] static extern bool ShowWindow(IntPtr window, int command);
    [DllImport("user32.dll")] static extern IntPtr GetAncestor(IntPtr window, uint flags);
    [DllImport("user32.dll")] static extern bool GetCursorPos(out Point point);
    [DllImport("user32.dll")] static extern IntPtr MonitorFromPoint(Point point, uint flags);
    [DllImport("user32.dll")] static extern IntPtr MonitorFromWindow(IntPtr window, uint flags);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern bool GetMonitorInfo(IntPtr monitor, ref MonitorInfo info);
    [DllImport("user32.dll")] static extern bool GetWindowRect(IntPtr window, out Rect rect);
    [DllImport("user32.dll")] static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);
    [DllImport("user32.dll")] static extern bool SetWindowPos(IntPtr window, IntPtr after, int x, int y, int width, int height, uint flags);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] static extern int GetWindowLong(IntPtr window, int index);
    [DllImport("user32.dll")] static extern bool PostMessage(IntPtr window, uint message, IntPtr key, IntPtr data);
    [DllImport("user32.dll")] static extern IntPtr SetThreadDpiAwarenessContext(IntPtr context);
    public static long SourceWindow;
    static IntPtr EnterDpi() { try { return SetThreadDpiAwarenessContext(new IntPtr(-4)); } catch (EntryPointNotFoundException) { return IntPtr.Zero; } }
    static void LeaveDpi(IntPtr old) { if (old != IntPtr.Zero) SetThreadDpiAwarenessContext(old); }
    public static int[] Capture(long[] candidates) {
        IntPtr old = EnterDpi();
        try {
            var sources = new HashSet<IntPtr>();
            foreach (long candidate in candidates ?? new long[0]) sources.Add(GetAncestor(new IntPtr(candidate), 2));
            IntPtr source = IntPtr.Zero;
            EnumWindows(delegate(IntPtr window, IntPtr unused) {
                if (sources.Contains(window) && IsWindowVisible(window)) { source = window; return false; }
                return true;
            }, IntPtr.Zero);
            SourceWindow = source.ToInt64();
            Point cursor;
            GetCursorPos(out cursor);
            IntPtr monitor = source != IntPtr.Zero ? MonitorFromWindow(source, 2) : MonitorFromPoint(cursor, 2);
            var info = new MonitorInfo { Size = Marshal.SizeOf(typeof(MonitorInfo)) };
            if (!GetMonitorInfo(monitor, ref info)) return null;
            Rect r = info.Work;
            return new[] { r.Left, r.Top, r.Right - r.Left, r.Bottom - r.Top };
        } finally { LeaveDpi(old); }
    }
    public static long ConsoleWindow(string token) {
        IntPtr console = GetConsoleWindow();
        if (console != IntPtr.Zero && IsWindowVisible(console)) return console.ToInt64();
        // Windows Terminal hosts a hidden pseudoconsole; identify its visible host
        // by a temporary unique title instead of moving an unrelated foreground window.
        IntPtr host = IntPtr.Zero;
        EnumWindows(delegate(IntPtr window, IntPtr unused) {
            if (!IsWindowVisible(window)) return true;
            var title = new StringBuilder(1024);
            GetWindowText(window, title, title.Capacity);
            if (title.ToString().Contains(token)) { host = window; return false; }
            return true;
        }, IntPtr.Zero);
        return host.ToInt64();
    }
    public static int[] PlaceConsole(long handle, int[] work) {
        IntPtr old = EnterDpi();
        try {
            IntPtr window = new IntPtr(handle);
            if (!IsWindowVisible(window)) return null;
            if (IsIconic(window) || IsZoomed(window)) ShowWindow(window, 9);
            Rect r;
            if (!GetWindowRect(window, out r)) return null;
            int width = Math.Min(r.Right - r.Left, work[2]);
            int height = Math.Min(r.Bottom - r.Top, work[3]);
            int left = work[0] + (work[2] - width) / 2;
            int top = work[1] + (work[3] - height) / 2;
            if (!SetWindowPos(window, IntPtr.Zero, left, top, width, height, 0x14) || !GetWindowRect(window, out r)) return null;
            return new[] { r.Left, r.Top, r.Right - r.Left, r.Bottom - r.Top };
        } finally { LeaveDpi(old); }
    }
    public static int[] Place(long handle, uint owner, int[] bounds) {
        IntPtr old = EnterDpi();
        try {
            IntPtr window = new IntPtr(handle);
            uint actualOwner;
            GetWindowThreadProcessId(window, out actualOwner);
            if (actualOwner != owner || !IsWindowVisible(window)) return null;
            Rect r;
            if (!GetWindowRect(window, out r)) return null;
            if (r.Left != bounds[0] || r.Top != bounds[1] || r.Right - r.Left != bounds[2] || r.Bottom - r.Top != bounds[3]) {
                SetWindowPos(window, IntPtr.Zero, bounds[0], bounds[1], bounds[2], bounds[3], 0x14);
                if (!GetWindowRect(window, out r)) return null;
            }
            return new[] { r.Left, r.Top, r.Right - r.Left, r.Bottom - r.Top };
        } finally { LeaveDpi(old); }
    }
    public static bool RestoreWindowed(long handle, uint owner) {
        IntPtr window = new IntPtr(handle);
        uint actualOwner;
        GetWindowThreadProcessId(window, out actualOwner);
        if (actualOwner != owner || !IsWindowVisible(window)) return false;
        // Exit only a remembered native fullscreen state of the initial browser window.
        if ((GetWindowLong(window, -16) & 0x00c40000) != 0) return true;
        return PostMessage(window, 0x0100, new IntPtr(0x7a), new IntPtr(0x00570001)) &&
            PostMessage(window, 0x0101, new IntPtr(0x7a), new IntPtr(unchecked((int)0xc0570001)));
    }
}
'@
    $launchBounds = [HitLaunchWindow]::Capture([long[]]$sourceWindows)
    $launchSource = [HitLaunchWindow]::SourceWindow
}
function Read-Presentation {
    $source = [System.IO.File]::ReadAllText($SelfPath, [System.Text.Encoding]::UTF8)
    $match = [regex]::Match($source, '(?s)\r?\n<!-- === HIT HTML START === -->\r?\n(.*)\z')
    if (-not $match.Success) { throw '未找到内嵌 HTML，请重新下载完整的 HIT-HTML-local.cmd。' }
    $html = [regex]::Replace($match.Groups[1].Value, '<!--HIT-GZIP:([A-Za-z0-9+/=]+)-->', [System.Text.RegularExpressions.MatchEvaluator]{
        param($asset)
        $assetStream = [System.IO.MemoryStream]::new([Convert]::FromBase64String($asset.Groups[1].Value), $false)
        $assetGzip = [System.IO.Compression.GZipStream]::new($assetStream, [System.IO.Compression.CompressionMode]::Decompress)
        $assetReader = [System.IO.StreamReader]::new($assetGzip, [System.Text.Encoding]::UTF8)
        try { $assetReader.ReadToEnd() } finally {
            $assetReader.Dispose()
            $assetGzip.Dispose()
            $assetStream.Dispose()
        }
    })
    return ,([System.Text.Encoding]::UTF8.GetBytes($html))
}
[void](Read-Presentation)
$listener = $null
$lastPort = if ($Port -eq 0) { 0 } else { [Math]::Min($Port + 10, 65535) }
for ($candidate = $Port; $candidate -le $lastPort; $candidate++) {
    $attempt = [System.Net.Sockets.TcpListener]::new([System.Net.IPAddress]::Loopback, $candidate)
    try {
        $attempt.Start()
        $listener = $attempt
        break
    } catch [System.Net.Sockets.SocketException] {
        $attempt.Stop()
        if ($candidate -eq $lastPort) { throw }
    }
}
$boundPort = $listener.LocalEndpoint.Port
$url = 'http://127.0.0.1:{0}/HIT-HTML.html' -f $boundPort
$browserState = @{ Process = $null; Lock = $null; Path = $null; OwnerFile = $null; Temporary = $false; Window = 0L; WindowRect = $null; Placed = $false; PlaceUntil = $null; WindowSince = $null; PageServed = $false; WindowedRequested = $false }
$consoleInput = -not [Console]::IsInputRedirected
$consoleWindow = 0L
$consoleRect = $null
$oldConsoleTitle = $null
$oldControlC = $null
$stdinStream = $null
$stdinTask = $null

function Set-PresentationBrowserPermissions {
    # Configure only this launcher's owned profile and exact loopback origin.
    # Screen-management consent remains a normal browser permission prompt.
    $folder = Join-Path $browserState.Path 'Default'
    [void][IO.Directory]::CreateDirectory($folder)
    $file = Join-Path $folder 'Preferences'
    $prefs = if (Test-Path -LiteralPath $file) {
        ConvertFrom-Json -InputObject ([IO.File]::ReadAllText($file, [Text.Encoding]::UTF8))
    } else { [pscustomobject]@{} }
    $node = $prefs
    foreach ($name in @('profile', 'content_settings', 'exceptions')) {
        if (-not $node.PSObject.Properties[$name] -or $null -eq $node.$name) {
            $node | Add-Member -NotePropertyName $name -NotePropertyValue ([pscustomobject]@{}) -Force
        }
        $node = $node.$name
    }
    $origin = ([Uri]$url).GetLeftPart([UriPartial]::Authority) + ',*'
    foreach ($name in @('automatic_fullscreen', 'popups')) {
        if (-not $node.PSObject.Properties[$name] -or $null -eq $node.$name) {
            $node | Add-Member -NotePropertyName $name -NotePropertyValue ([pscustomobject]@{}) -Force
        }
        $node.$name | Add-Member -NotePropertyName $origin -NotePropertyValue ([pscustomobject]@{ setting = 1 }) -Force
    }
    $json = ConvertTo-Json -InputObject $prefs -Depth 100 -Compress
    [IO.File]::WriteAllText($file + '.hit.tmp', $json, [Text.UTF8Encoding]::new($false))
    Move-Item -LiteralPath ($file + '.hit.tmp') -Destination $file -Force
}

function Start-PresentationBrowser([string]$Executable) {
    # A dedicated profile gives this launcher ownership of its browser process,
    # and preserves permissions/layout between ordinary runs of the same CMD.
    $profileRoot = if ($env:HIT_PRESENTATION_PROFILE_ROOT) { $env:HIT_PRESENTATION_PROFILE_ROOT } else {
        Join-Path ([Environment]::GetFolderPath('LocalApplicationData')) 'HIT-HTML'
    }
    [void][IO.Directory]::CreateDirectory($profileRoot)
    $hash = [Security.Cryptography.SHA256]::Create()
    try { $key = [BitConverter]::ToString($hash.ComputeHash([Text.Encoding]::UTF8.GetBytes($SelfPath.ToLowerInvariant()))).Replace('-', '').Substring(0, 16) }
    finally { $hash.Dispose() }
    $browserState.Path = Join-Path $profileRoot ('browser-' + $key)
    $browserState.OwnerFile = $browserState.Path + '.pid'
    try {
        $browserState.Lock = [IO.File]::Open($browserState.Path + '.lock', [IO.FileMode]::OpenOrCreate, [IO.FileAccess]::ReadWrite, [IO.FileShare]::None)
        if (Test-Path -LiteralPath $browserState.OwnerFile) {
            $oldBrowserId = 0
            if ([int]::TryParse([IO.File]::ReadAllText($browserState.OwnerFile), [ref]$oldBrowserId) -and (Get-Process -Id $oldBrowserId -ErrorAction SilentlyContinue)) { throw [IO.IOException]::new('Profile still in use') }
        }
    } catch [IO.IOException] {
        if ($browserState.Lock) { $browserState.Lock.Dispose(); $browserState.Lock = $null }
        $browserState.Path += '-' + [Guid]::NewGuid().ToString('N')
        $browserState.OwnerFile = $null
        $browserState.Temporary = $true
    }
    # Quotes belong in ArgumentList on Windows PowerShell, including paths with spaces.
    $arguments = @('--no-first-run', '--no-default-browser-check', '--disable-background-mode', ('--user-data-dir="{0}"' -f $browserState.Path), '--new-window', ('"{0}"' -f $url))
    if ($launchBounds) {
        $arguments += ('--window-position={0},{1}' -f $launchBounds[0], $launchBounds[1])
        $arguments += ('--window-size={0},{1}' -f $launchBounds[2], $launchBounds[3])
        $browserState.PlaceUntil = [DateTime]::UtcNow.AddSeconds(15)
    }
    if ($env:HIT_PRESENTATION_BROWSER_ARGUMENTS) {
        foreach ($argument in (ConvertFrom-Json -InputObject $env:HIT_PRESENTATION_BROWSER_ARGUMENTS)) { $arguments += [string]$argument }
    }
    Set-PresentationBrowserPermissions
    $browserState.Process = Start-Process -FilePath $Executable -ArgumentList $arguments -RedirectStandardOutput (Join-Path $browserState.Path 'hit-launcher.out.log') -RedirectStandardError (Join-Path $browserState.Path 'hit-launcher.err.log') -PassThru
    if ($browserState.OwnerFile) { [IO.File]::WriteAllText($browserState.OwnerFile, [string]$browserState.Process.Id) }
}

function Write-ReadyInfo {
    if (-not $ReadyFile) { return }
    @{ url = $url; port = $boundPort; address = '127.0.0.1'; browserPid = $(if ($browserState.Process) { $browserState.Process.Id } else { 0 }); profile = $browserState.Path; launchBounds = $launchBounds; launchSource = $launchSource; consoleWindow = $consoleWindow; consoleRect = $consoleRect; windowPlaced = $browserState.Placed; windowRect = $browserState.WindowRect } |
        ConvertTo-Json -Compress | Set-Content -LiteralPath ($ReadyFile + '.tmp') -Encoding UTF8
    Move-Item -LiteralPath ($ReadyFile + '.tmp') -Destination $ReadyFile -Force
}

function Update-LaunchWindow {
    if (-not $browserState.PlaceUntil -or -not $browserState.Process) { return }
    if ([DateTime]::UtcNow -gt $browserState.PlaceUntil) { $browserState.PlaceUntil = $null; return }
    if (-not $browserState.Window) {
        $browserState.Process.Refresh()
        $browserState.Window = $browserState.Process.MainWindowHandle.ToInt64()
        if (-not $browserState.Window) { return }
        $browserState.WindowSince = [DateTime]::UtcNow
    }
    # Pin only the initial browser window; never reposition a later audience popup.
    $browserState.WindowRect = [HitLaunchWindow]::Place($browserState.Window, [uint32]$browserState.Process.Id, [int[]]$launchBounds)
    if (-not $browserState.WindowedRequested -and $browserState.PageServed -and ([DateTime]::UtcNow - $browserState.WindowSince).TotalSeconds -ge 0.25) {
        $browserState.WindowedRequested = [HitLaunchWindow]::RestoreWindowed($browserState.Window, [uint32]$browserState.Process.Id)
    }
    if ($browserState.WindowRect -and $browserState.WindowedRequested -and ([DateTime]::UtcNow - $browserState.WindowSince).TotalSeconds -ge 1) {
        $browserState.Placed = (@(0..3 | Where-Object { $browserState.WindowRect[$_] -ne $launchBounds[$_] }).Count -eq 0)
        if ($browserState.Placed) { $browserState.PlaceUntil = $null; Write-ReadyInfo }
    }
}

function Stop-PresentationBrowser {
    if ($browserState.Process) {
        # Refresh lets CloseMainWindow find each remaining presentation window.
        $deadline = [DateTime]::UtcNow.AddSeconds(2)
        while (-not $browserState.Process.HasExited -and [DateTime]::UtcNow -lt $deadline) {
            try {
                $browserState.Process.Refresh()
                if (-not $browserState.Process.HasExited) { [void]$browserState.Process.CloseMainWindow() }
            } catch [InvalidOperationException] { if (-not $browserState.Process.HasExited) { throw } }
            Start-Sleep -Milliseconds 100
        }
        if (-not $browserState.Process.HasExited) {
            if ($onWindows) {
                try { & "$env:SystemRoot/System32/taskkill.exe" /PID $browserState.Process.Id /T /F > $null 2>&1 }
                catch { if (-not $browserState.Process.HasExited) { throw } }
            }
            else { $browserState.Process.Kill($true) }
            [void]$browserState.Process.WaitForExit(3000)
        }
        $browserState.Process.Dispose()
    }
    if ($browserState.OwnerFile) { Remove-Item -LiteralPath $browserState.OwnerFile -ErrorAction SilentlyContinue }
    if ($browserState.Lock) { $browserState.Lock.Dispose() }
    if ($browserState.Temporary -and $browserState.Path) {
        for ($attempt = 0; $attempt -lt 10 -and (Test-Path -LiteralPath $browserState.Path); $attempt++) {
            Remove-Item -LiteralPath $browserState.Path -Recurse -Force -ErrorAction SilentlyContinue
            if (Test-Path -LiteralPath $browserState.Path) { Start-Sleep -Milliseconds 100 }
        }
    }
}

function Send-Response($Stream, [int]$Status, [string]$Reason, [byte[]]$Body, [bool]$HeadOnly) {
    $headers = "HTTP/1.1 $Status $Reason`r`nContent-Type: text/html; charset=utf-8`r`nContent-Length: $($Body.Length)`r`nCache-Control: no-store`r`nPermissions-Policy: window-management=(self)`r`nCross-Origin-Resource-Policy: same-origin`r`nConnection: close`r`n`r`n"
    $bytes = [System.Text.Encoding]::ASCII.GetBytes($headers)
    $Stream.Write($bytes, 0, $bytes.Length)
    if (-not $HeadOnly -and $Body.Length) { $Stream.Write($Body, 0, $Body.Length) }
    $Stream.Flush()
}

try {
    if ($onWindows -and $consoleInput -and $launchBounds) {
        $oldConsoleTitle = [Console]::Title
        $consoleToken = 'HIT-' + [Guid]::NewGuid().ToString('N')
        [Console]::Title = $consoleToken
        $consoleDeadline = [DateTime]::UtcNow.AddSeconds(2)
        do {
            $consoleWindow = [HitLaunchWindow]::ConsoleWindow($consoleToken)
            if ($consoleWindow) {
                $consoleRect = [HitLaunchWindow]::PlaceConsole($consoleWindow, [int[]]$launchBounds)
                break
            }
            Start-Sleep -Milliseconds 50
        } while ([DateTime]::UtcNow -lt $consoleDeadline)
        [Console]::Title = 'HIT 本地演示'
    }
    Write-Host ''
    Write-Host 'HIT 本地演示已启动（无需联网）。'
    Write-Host $url
    Write-Host '请保持此窗口打开；结束时按 Q 或 Esc，一并关闭放映窗口和本地服务。'
    Write-Host '双屏：系统设为扩展 -> 点击演讲 -> 允许本机地址的屏幕管理权限。'
    Write-Host '修改内容：编辑此 CMD 末尾的页面文字、CONFIG 和 NOTES，按 UTF-8 保存后刷新。'
    if ($consoleInput) {
        # Read Ctrl+C as a key, so CMD never receives a batch-break event.
        $oldControlC = [Console]::TreatControlCAsInput
        [Console]::TreatControlCAsInput = $true
    } else {
        $stdinStream = [Console]::OpenStandardInput()
        $stdinByte = [byte[]]::new(1)
        $stdinTask = $stdinStream.ReadAsync($stdinByte, 0, 1)
    }
    if (-not $NoBrowser) {
        $browserPaths = @(
            "${env:ProgramFiles(x86)}/Microsoft/Edge/Application/msedge.exe",
            "$env:ProgramFiles/Microsoft/Edge/Application/msedge.exe",
            "$env:ProgramFiles/Google/Chrome/Application/chrome.exe",
            "${env:ProgramFiles(x86)}/Google/Chrome/Application/chrome.exe",
            "$env:LOCALAPPDATA/Google/Chrome/Application/chrome.exe",
            "$env:LOCALAPPDATA/Microsoft/Edge/Application/msedge.exe"
        )
        $browser = if ($BrowserPath) { $BrowserPath } else { $browserPaths | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1 }
        try {
            if ($browser) { Start-PresentationBrowser $browser }
            else { Write-Host '未找到 Edge / Chrome，请手动打开上方地址；手动打开的页面需自行关闭。' }
        } catch {
            Write-Host '未能自动打开浏览器，请复制上方地址到 Chrome 或 Edge。'
            Write-Host $_.Exception.Message
        }
    }
    Write-ReadyInfo
    while ($true) {
        if ($consoleInput -and [Console]::KeyAvailable) {
            $key = [Console]::ReadKey($true)
            if ($key.Key -in @([ConsoleKey]::Q, [ConsoleKey]::Escape) -or [int]$key.KeyChar -eq 3) { break }
        } elseif ($stdinTask -and $stdinTask.IsCompleted) {
            if ($stdinTask.GetAwaiter().GetResult() -eq 0) { $stdinTask = $null }
            elseif ($stdinByte[0] -in @(81, 113, 27, 3)) { break }
            else { $stdinTask = $stdinStream.ReadAsync($stdinByte, 0, 1) }
        }
        if ($browserState.Process -and $browserState.Process.HasExited) { break }
        Update-LaunchWindow
        if (-not $listener.Pending()) { Start-Sleep -Milliseconds 50; continue }
        $client = $listener.AcceptTcpClient()
        $stream = $null
        $reader = $null
        try {
            $stream = $client.GetStream()
            $stream.ReadTimeout = 1500
            $stream.WriteTimeout = 5000
            $reader = [System.IO.StreamReader]::new($stream, [System.Text.Encoding]::ASCII, $false, 4096, $true)
            $line = $reader.ReadLine()
            if (-not $line -or $line.Length -gt 2048 -or $line -notmatch '^(GET|HEAD) (/[^ ]*) HTTP/1\.[01]$') {
                Send-Response $stream 405 'Method Not Allowed' ([byte[]]@()) $false
                continue
            }
            $headOnly = $Matches[1] -eq 'HEAD'
            $requestPath = $Matches[2].Split('?')[0]
            $headerLength = 0
            $hostAllowed = $false
            while ($null -ne ($line = $reader.ReadLine()) -and $line -ne '') {
                $headerLength += $line.Length
                if ($headerLength -gt 16384) { throw 'Request headers too large' }
                if ($line -match '^Host:\s*(.+?)\s*$') {
                    $hostAllowed = $Matches[1] -in @("127.0.0.1:$boundPort", "localhost:$boundPort")
                }
            }
            if (-not $hostAllowed) {
                Send-Response $stream 400 'Bad Request' ([byte[]]@()) $headOnly
            } elseif ($requestPath -in @('/', '/HIT-HTML.html')) {
                Send-Response $stream 200 'OK' (Read-Presentation) $headOnly
                if (-not $headOnly) { $browserState.PageServed = $true }
            } elseif ($requestPath -eq '/favicon.ico') {
                Send-Response $stream 204 'No Content' ([byte[]]@()) $headOnly
            } else {
                Send-Response $stream 404 'Not Found' ([byte[]]@()) $headOnly
            }
        } catch [System.IO.IOException] {
            # A browser may close a speculative connection without sending a request.
        } finally {
            if ($reader) { $reader.Dispose() }
            if ($stream) { $stream.Dispose() }
            $client.Close()
        }
    }
} finally {
    $listener.Stop()
    try { Stop-PresentationBrowser } finally {
        if ($null -ne $oldConsoleTitle) { [Console]::Title = $oldConsoleTitle }
        if ($null -ne $oldControlC) { [Console]::TreatControlCAsInput = $oldControlC }
        if ($stdinStream) { $stdinStream.Dispose() }
        if ($ReadyFile) { Remove-Item -LiteralPath $ReadyFile -ErrorAction SilentlyContinue }
        if ($ReadyFile) { Remove-Item -LiteralPath ($ReadyFile + '.tmp') -ErrorAction SilentlyContinue }
    }
    Write-Host '放映已结束。'
}
