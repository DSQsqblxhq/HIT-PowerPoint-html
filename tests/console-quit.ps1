param([string]$Launcher, [string]$ReadyFile, [ValidateSet('Q', 'CtrlC')][string]$Key)
$ErrorActionPreference = 'Stop'
Add-Type @'
using System;
using System.ComponentModel;
using System.Runtime.InteropServices;
public static class HitConsoleQuitTest {
    [StructLayout(LayoutKind.Explicit, CharSet = CharSet.Unicode)]
    public struct InputRecord {
        [FieldOffset(0)] public ushort EventType;
        [FieldOffset(4)] public int KeyDown;
        [FieldOffset(8)] public ushort RepeatCount;
        [FieldOffset(10)] public ushort VirtualKey;
        [FieldOffset(12)] public ushort ScanCode;
        [FieldOffset(14)] public char Character;
        [FieldOffset(16)] public uint ControlState;
    }
    [DllImport("kernel32.dll", SetLastError = true)] static extern bool AttachConsole(uint processId);
    [DllImport("kernel32.dll")] static extern bool FreeConsole();
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)] static extern IntPtr CreateFile(string name, uint access, uint share, IntPtr security, uint creation, uint flags, IntPtr template);
    [DllImport("kernel32.dll", SetLastError = true)] static extern bool GetConsoleMode(IntPtr handle, out uint mode);
    [DllImport("kernel32.dll", SetLastError = true)] static extern bool WriteConsoleInputW(IntPtr handle, InputRecord[] records, uint count, out uint written);
    [DllImport("kernel32.dll")] static extern bool CloseHandle(IntPtr handle);
    public static void Send(uint processId, bool controlC) {
        FreeConsole();
        if (!AttachConsole(processId)) throw new Win32Exception();
        IntPtr input = CreateFile("CONIN$", 0xc0000000, 3, IntPtr.Zero, 3, 0, IntPtr.Zero);
        try {
            uint mode;
            if (!GetConsoleMode(input, out mode)) throw new Win32Exception();
            if ((mode & 1) != 0) throw new Exception("Ctrl+C would still generate a CMD batch-break event");
            var key = new InputRecord { EventType = 1, KeyDown = 1, RepeatCount = 1, VirtualKey = (ushort)(controlC ? 0x43 : 0x51), Character = controlC ? '\u0003' : 'q', ControlState = controlC ? 8u : 0u };
            uint written;
            if (!WriteConsoleInputW(input, new[] { key }, 1, out written) || written != 1) throw new Win32Exception();
        } finally { CloseHandle(input); FreeConsole(); }
    }
}
'@
$env:HIT_PRESENTATION_NO_BROWSER = '1'
$env:HIT_PRESENTATION_PORT = '0'
$env:HIT_PRESENTATION_READY_FILE = $ReadyFile
$process = Start-Process -FilePath $env:ComSpec -ArgumentList @('/d', '/s', '/c', ('""{0}""' -f $Launcher)) -PassThru -WindowStyle Hidden
try {
    $deadline = [DateTime]::UtcNow.AddSeconds(20)
    while (-not (Test-Path -LiteralPath $ReadyFile) -and -not $process.HasExited -and [DateTime]::UtcNow -lt $deadline) { Start-Sleep -Milliseconds 50 }
    if (-not (Test-Path -LiteralPath $ReadyFile)) { throw 'Native-console launcher did not become ready' }
    [HitConsoleQuitTest]::Send([uint32]$process.Id, $Key -eq 'CtrlC')
    if (-not $process.WaitForExit(8000)) { throw 'Native console still waits for input or a Y/N confirmation' }
    if ($process.ExitCode -ne 0) { throw "Native CMD failed with exit code $($process.ExitCode)" }
    if (Test-Path -LiteralPath $ReadyFile) { throw 'Native console did not clean up the local server' }
    Write-Output "PASS native Windows console: $Key exits without Enter or a Y/N confirmation"
} finally {
    if (-not $process.HasExited) { & "$env:SystemRoot/System32/taskkill.exe" /PID $process.Id /T /F > $null 2>&1 }
    $process.Dispose()
}
