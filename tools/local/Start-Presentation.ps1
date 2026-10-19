param(
    [ValidateRange(0, 65535)][int]$Port = $(if ($env:HIT_PRESENTATION_PORT) { $env:HIT_PRESENTATION_PORT } else { 8765 }),
    [string]$SelfPath = $env:HIT_PRESENTATION_SELF,
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
    Write-Host '修改内容：编辑此 CMD 末尾的页面文字、CONFIG 和 NOTES，按 UTF-8 保存后刷新。'
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
    if ($ReadyFile) { Remove-Item -LiteralPath $ReadyFile -ErrorAction SilentlyContinue }
}
