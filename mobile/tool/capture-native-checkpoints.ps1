param(
    [Parameter(Mandatory = $true)][string]$AdbPath,
    [string]$Device = 'fb0caebb'
)

# Start before flutter drive with CAPTURE_NATIVE_CHECKPOINTS=true.
# Captures only named, synthetic test screens while each checkpoint is open.
$taskRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..')).Path
$taskLogPath = Join-Path $taskRoot 'build/phase2-device-checkpoints.log'
$taskOutput = Join-Path $taskRoot 'build/device-review'
New-Item -ItemType Directory -Force -Path $taskOutput | Out-Null
$taskStarted = Get-Date
$taskDeadline = $taskStarted.AddMinutes(3)
$taskSeen = @{}
while ((Get-Date) -lt $taskDeadline -and $taskSeen.Count -lt 8) {
    if ((Test-Path -LiteralPath $taskLogPath) -and
        (Get-Item -LiteralPath $taskLogPath).LastWriteTime -ge $taskStarted) {
        $taskText = [string](Get-Content -Raw -LiteralPath $taskLogPath -ErrorAction SilentlyContinue)
        $taskMatches = [regex]::Matches($taskText, 'FTEMATION_NATIVE_SCREEN:(phase2-[a-z]+)')
        if ($taskMatches.Count -gt 0) {
            $taskName = $taskMatches[$taskMatches.Count - 1].Groups[1].Value
            if (-not $taskSeen.ContainsKey($taskName)) {
                $taskRemote = "/sdcard/Download/ftemation-live-$taskName.png"
                & $AdbPath -s $Device shell screencap -p $taskRemote
                if ($LASTEXITCODE -ne 0) { throw 'Native capture failed.' }
                & $AdbPath -s $Device pull $taskRemote (Join-Path $taskOutput "live-$taskName.png")
                if ($LASTEXITCODE -ne 0) { throw 'Native image download failed.' }
                $taskSeen[$taskName] = $true
                Write-Output "Captured native checkpoint: $taskName"
            }
        }
    }
    Start-Sleep -Milliseconds 200
}
if ($taskSeen.Count -ne 8) { throw "Expected eight checkpoints; captured $($taskSeen.Count)." }
