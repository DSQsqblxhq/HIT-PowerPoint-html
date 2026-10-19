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
$browserState = @{ Process = $null; Lock = $null; Path = $null; OwnerFile = $null; Temporary = $false }
$onWindows = [Environment]::OSVersion.Platform -eq [PlatformID]::Win32NT
$consoleInput = -not [Console]::IsInputRedirected
$oldControlC = $null
$stdinStream = $null
$stdinTask = $null

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
    $arguments = @('--no-first-run', '--no-default-browser-check', '--disable-background-mode', ('--user-data-dir="{0}"' -f $browserState.Path), ('--app="{0}"' -f $url))
    if ($env:HIT_PRESENTATION_BROWSER_ARGUMENTS) {
        foreach ($argument in (ConvertFrom-Json -InputObject $env:HIT_PRESENTATION_BROWSER_ARGUMENTS)) { $arguments += [string]$argument }
    }
    [void][IO.Directory]::CreateDirectory($browserState.Path)
    $browserState.Process = Start-Process -FilePath $Executable -ArgumentList $arguments -RedirectStandardOutput (Join-Path $browserState.Path 'hit-launcher.out.log') -RedirectStandardError (Join-Path $browserState.Path 'hit-launcher.err.log') -PassThru
    if ($browserState.OwnerFile) { [IO.File]::WriteAllText($browserState.OwnerFile, [string]$browserState.Process.Id) }
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
    Write-Host ''
    Write-Host 'HIT 本地演示已启动（无需联网）。'
    Write-Host $url
    Write-Host '请保持此窗口打开；结束时按 Q 或 Esc，一并关闭放映窗口和本地服务。'
    Write-Host '双屏：系统设为扩展 -> 点击演讲者 -> 允许本机地址的屏幕管理权限。'
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
    if ($ReadyFile) {
        @{ url = $url; port = $boundPort; address = '127.0.0.1'; browserPid = $(if ($browserState.Process) { $browserState.Process.Id } else { 0 }); profile = $browserState.Path } |
            ConvertTo-Json -Compress | Set-Content -LiteralPath ($ReadyFile + '.tmp') -Encoding UTF8
        Move-Item -LiteralPath ($ReadyFile + '.tmp') -Destination $ReadyFile -Force
    }
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
        if ($null -ne $oldControlC) { [Console]::TreatControlCAsInput = $oldControlC }
        if ($stdinStream) { $stdinStream.Dispose() }
        if ($ReadyFile) { Remove-Item -LiteralPath $ReadyFile -ErrorAction SilentlyContinue }
        if ($ReadyFile) { Remove-Item -LiteralPath ($ReadyFile + '.tmp') -ErrorAction SilentlyContinue }
    }
    Write-Host '放映已结束。'
}
