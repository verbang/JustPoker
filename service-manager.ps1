Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

$form = New-Object System.Windows.Forms.Form
$form.Text = "JustPoker Service Manager"
$form.Size = New-Object System.Drawing.Size(360, 220)
$form.StartPosition = [System.Windows.Forms.FormStartPosition]::CenterScreen
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedSingle
$form.MaximizeBox = $false
$form.BackColor = [System.Drawing.Color]::FromArgb(30, 30, 30)

$labelStatus = New-Object System.Windows.Forms.Label
$labelStatus.Location = New-Object System.Drawing.Point(20, 15)
$labelStatus.Size = New-Object System.Drawing.Size(310, 25)
$labelStatus.Font = New-Object System.Drawing.Font("Microsoft YaHei", 10)
$labelStatus.ForeColor = [System.Drawing.Color]::White
$labelStatus.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter

function Get-PortPid($port) {
    try {
        $c = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
        if ($c) { return $c[0].OwningProcess }
    } catch {}
    return $null
}

function Update-Status {
    $sp = Get-PortPid 3000
    $cp = Get-PortPid 5173
    if ($sp -and $cp) {
        $labelStatus.Text = "Backend :3000 OK  |  Frontend :5173 OK"
        $labelStatus.ForeColor = [System.Drawing.Color]::FromArgb(100, 220, 100)
    } elseif ($sp) {
        $labelStatus.Text = "Backend :3000 OK  |  Frontend :5173 OFF"
        $labelStatus.ForeColor = [System.Drawing.Color]::FromArgb(255, 200, 60)
    } elseif ($cp) {
        $labelStatus.Text = "Backend :3000 OFF  |  Frontend :5173 OK"
        $labelStatus.ForeColor = [System.Drawing.Color]::FromArgb(255, 200, 60)
    } else {
        $labelStatus.Text = "Services not running"
        $labelStatus.ForeColor = [System.Drawing.Color]::FromArgb(200, 80, 80)
    }
}

function Make-Btn($text, $x, $color) {
    $btn = New-Object System.Windows.Forms.Button
    $btn.Text = $text
    $btn.Location = New-Object System.Drawing.Point($x, 55)
    $btn.Size = New-Object System.Drawing.Size(95, 38)
    $btn.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
    $btn.Font = New-Object System.Drawing.Font("Microsoft YaHei", 10, [System.Drawing.FontStyle]::Bold)
    $btn.BackColor = $color
    $btn.ForeColor = [System.Drawing.Color]::White
    $btn.FlatAppearance.BorderSize = 0
    $btn.Cursor = [System.Windows.Forms.Cursors]::Hand
    return $btn
}

$btnStart = Make-Btn "Start" 20 ([System.Drawing.Color]::FromArgb(56, 142, 60))
$btnStop = Make-Btn "Stop" 125 ([System.Drawing.Color]::FromArgb(198, 40, 40))
$btnRestart = Make-Btn "Restart" 230 ([System.Drawing.Color]::FromArgb(30, 136, 229))

$logBox = New-Object System.Windows.Forms.TextBox
$logBox.Location = New-Object System.Drawing.Point(20, 105)
$logBox.Size = New-Object System.Drawing.Size(310, 70)
$logBox.Multiline = $true
$logBox.ScrollBars = [System.Windows.Forms.ScrollBars]::Vertical
$logBox.ReadOnly = $true
$logBox.BackColor = [System.Drawing.Color]::FromArgb(20, 20, 20)
$logBox.ForeColor = [System.Drawing.Color]::FromArgb(180, 180, 180)
$logBox.Font = New-Object System.Drawing.Font("Consolas", 8.5)

function Log($msg) {
    $t = Get-Date -Format "HH:mm:ss"
    $logBox.AppendText("[$t] $msg`r`n")
}

function Stop-Services {
    Log "Stopping services..."
    $sp = Get-PortPid 3000
    $cp = Get-PortPid 5173
    if ($sp) { Stop-Process -Id $sp -Force -ErrorAction SilentlyContinue; Log "Backend stopped (PID $sp)" }
    if ($cp) { Stop-Process -Id $cp -Force -ErrorAction SilentlyContinue; Log "Frontend stopped (PID $cp)" }
    if (-not $sp -and -not $cp) { Log "No running services found" }
    Start-Sleep -Seconds 1
    Update-Status
}

$btnStart.Add_Click({
    $sp = Get-PortPid 3000
    $cp = Get-PortPid 5173
    if ($sp -and $cp) { Log "Services already running"; return }

    $serverDir = "$scriptDir\server"
    $clientDir = "$scriptDir\client"

    Log "Starting backend (port 3000)..."
    Start-Process -FilePath "cmd" -ArgumentList "/k cd /d `"$serverDir`" & npm run dev" -WindowStyle Minimized
    Start-Sleep -Seconds 4

    Log "Starting frontend (port 5173)..."
    Start-Process -FilePath "cmd" -ArgumentList "/k cd /d `"$clientDir`" & npm run dev" -WindowStyle Minimized
    Start-Sleep -Seconds 2

    Update-Status
    Log "Services started"
})

$btnStop.Add_Click({ Stop-Services })

$btnRestart.Add_Click({
    Stop-Services
    Start-Sleep -Seconds 1
    $btnStart.PerformClick()
})

$timer = New-Object System.Windows.Forms.Timer
$timer.Interval = 3000
$timer.Add_Tick({ Update-Status })
$timer.Start()

$form.Controls.AddRange(@($labelStatus, $btnStart, $btnStop, $btnRestart, $logBox))
Update-Status
$form.Add_FormClosing({ $timer.Stop() })
[void]$form.ShowDialog()
