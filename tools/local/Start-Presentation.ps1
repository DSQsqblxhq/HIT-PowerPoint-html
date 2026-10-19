param(
    [ValidateRange(0, 65535)][int]$Port = 8765,
    [string]$HtmlPath,
    [switch]$NoBrowser,
    [string]$ReadyFile
)

$ErrorActionPreference = 'Stop'
if (-not $HtmlPath) {
    $HtmlPath = Join-Path $PSScriptRoot 'HIT-HTML.html'
    if (-not (Test-Path -LiteralPath $HtmlPath -PathType Leaf)) {
        $HtmlPath = Join-Path $PSScriptRoot '../../HIT-HTML.html'
    }
}
$HtmlPath = (Resolve-Path -LiteralPath $HtmlPath).Path
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
    Write-Host '请保持此窗口打开；结束后按 Ctrl+C 关闭。'
    Write-Host '双屏：系统设为扩展 -> 点击演讲者 -> 允许本机地址的屏幕管理权限。'
    if ($ReadyFile) {
        @{ url = $url; port = $boundPort; address = '127.0.0.1' } |
            ConvertTo-Json -Compress | Set-Content -LiteralPath $ReadyFile -Encoding UTF8
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
        $browser = $browserPaths | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
        try {
            if ($browser) { Start-Process -FilePath $browser -ArgumentList @('--new-window', $url) }
            else { Start-Process $url }
        } catch {
            Write-Host '未能自动打开浏览器，请复制上方地址到 Chrome 或 Edge。'
        }
    }
    while ($true) {
        # Polling keeps Ctrl+C responsive on Windows PowerShell 5.1.
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
                Send-Response $stream 200 'OK' ([System.IO.File]::ReadAllBytes($HtmlPath)) $headOnly
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
    if ($ReadyFile) { Remove-Item -LiteralPath $ReadyFile -ErrorAction SilentlyContinue }
}
