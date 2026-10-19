param([ValidateSet('Open', 'Close')][string]$Operation, [string]$Path, [long]$Window = 0)
$ErrorActionPreference = 'Stop'
$shell = New-Object -ComObject Shell.Application
try {
    if ($Operation -eq 'Close') {
        foreach ($view in $shell.Windows()) { if ([long]$view.HWND -eq $Window) { $view.Quit(); break } }
        return
    }
    $folder = [IO.Path]::GetDirectoryName($Path)
    $name = [IO.Path]::GetFileName($Path)
    [void]$shell.Open($folder)
    $deadline = [DateTime]::UtcNow.AddSeconds(15)
    while ([DateTime]::UtcNow -lt $deadline) {
        foreach ($view in $shell.Windows()) {
            try {
                if ($view.Document.Folder.Self.Path -ine $folder) { continue }
                $item = $view.Document.Folder.ParseName($name)
                if (-not $item) { continue }
                [void]$view.Document.SelectItem($item, 29)
                @{ hwnd = [long]$view.HWND } | ConvertTo-Json -Compress
                return
            } catch {}
        }
        Start-Sleep -Milliseconds 100
    }
    throw 'Could not select the CMD fixture in Explorer'
} finally { [void][Runtime.InteropServices.Marshal]::ReleaseComObject($shell) }
