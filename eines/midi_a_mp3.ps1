# =============================================================================
#  midi_a_mp3.ps1 — Converteix tots els .mid d'una carpeta a .mp3
#
#  Gasta MuseScore, que porta sintetitzador i banc de sons. L'ffmpeg sol NO
#  serveix per a això: no sap sintetitzar MIDI, només reempaquetar àudio.
#
#  Ús:
#    .\eines\midi_a_mp3.ps1                      la carpeta on estàs
#    .\eines\midi_a_mp3.ps1 -Carpeta C:\midis    una altra carpeta
#    .\eines\midi_a_mp3.ps1 -Bitrate 320         qualitat més alta
#    .\eines\midi_a_mp3.ps1 -Refer               refà els que ja existeixen
# =============================================================================

param(
  [string] $Carpeta = (Get-Location).Path,
  [int]    $Bitrate = 192,
  [switch] $Refer
)

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

# ─── Trobar MuseScore ────────────────────────────────────────────────────────

function Trobar-MuseScore {
  foreach ($n in @('MuseScore4', 'MuseScore3', 'mscore')) {
    $c = Get-Command $n -ErrorAction SilentlyContinue
    if ($c) { return $c.Source }
  }
  $llocs = @(
    "$env:ProgramFiles\MuseScore 4\bin\MuseScore4.exe",
    "$env:ProgramFiles\MuseScore 3\bin\MuseScore3.exe",
    "${env:ProgramFiles(x86)}\MuseScore 4\bin\MuseScore4.exe",
    "${env:ProgramFiles(x86)}\MuseScore 3\bin\MuseScore3.exe"
  )
  foreach ($p in $llocs) { if (Test-Path $p) { return $p } }
  return $null
}

$ms = Trobar-MuseScore
if (-not $ms) {
  Write-Host '  No trobe MuseScore.' -ForegroundColor Red
  Write-Host '  Instal.la''l de https://musescore.org (és gratuït) i torna-ho a provar.'
  Write-Host '  Fa falta ell i no l''ffmpeg: l''ffmpeg no sap sintetitzar MIDI.'
  exit 1
}

if (-not (Test-Path $Carpeta)) {
  Write-Host "  La carpeta no existeix: $Carpeta" -ForegroundColor Red
  exit 1
}

# ─── Els fitxers ─────────────────────────────────────────────────────────────

$midis = @(Get-ChildItem -Path $Carpeta -Filter '*.mid' -File -ErrorAction SilentlyContinue) +
         @(Get-ChildItem -Path $Carpeta -Filter '*.midi' -File -ErrorAction SilentlyContinue)

if ($midis.Count -eq 0) {
  Write-Host "  No hi ha cap .mid ni .midi a $Carpeta" -ForegroundColor Yellow
  exit 0
}

Write-Host ''
Write-Host "  MuseScore: $ms" -ForegroundColor DarkGray
Write-Host "  Carpeta:   $Carpeta"
Write-Host "  Fitxers:   $($midis.Count)  ·  bitrate $Bitrate kbps"
Write-Host ''

# ─── Conversió ───────────────────────────────────────────────────────────────

$fets = 0; $saltats = 0; $errors = @()
$i = 0

foreach ($m in $midis) {
  $i++
  $desti = Join-Path $m.DirectoryName ($m.BaseName + '.mp3')
  $etiqueta = "[$i/$($midis.Count)] $($m.Name)"

  if ((Test-Path $desti) -and -not $Refer) {
    Write-Host "  - $etiqueta  ja existeix, saltat" -ForegroundColor DarkGray
    $saltats++
    continue
  }

  # MuseScore escriu a stderr encara quan va bé; el que val és si el fitxer
  # existeix i té contingut, no el codi d'eixida.
  try {
    & $ms -o $desti -b $Bitrate $m.FullName 2>$null | Out-Null
  } catch {
    # seguim: ho decideix la comprovació de baix
  }

  if ((Test-Path $desti) -and ((Get-Item $desti).Length -gt 1024)) {
    $kb = [math]::Round((Get-Item $desti).Length / 1KB)
    Write-Host "  ok $etiqueta  ->  $($m.BaseName).mp3  ($kb KB)" -ForegroundColor Green
    $fets++
  } else {
    Write-Host "  XX $etiqueta  ha fallat" -ForegroundColor Red
    $errors += $m.Name
    if (Test-Path $desti) { Remove-Item $desti -Force }   # no deixem restes
  }
}

# ─── Resum ───────────────────────────────────────────────────────────────────

Write-Host ''
Write-Host "  Fets: $fets  ·  saltats: $saltats  ·  errors: $($errors.Count)"
if ($saltats -gt 0 -and -not $Refer) {
  Write-Host '  (gasta -Refer per a tornar a fer els que ja existien)' -ForegroundColor DarkGray
}
if ($errors.Count -gt 0) {
  Write-Host ''
  Write-Host '  Han fallat:' -ForegroundColor Red
  $errors | ForEach-Object { Write-Host "    $_" -ForegroundColor Red }
}
if ($fets -gt 0) {
  Write-Host ''
  Write-Host '  Escolta el primer abans de fiar-te de la resta: si la percussió' -ForegroundColor Yellow
  Write-Host '  sona a piano, el MIDI no la té al canal 10 (el de bateria).' -ForegroundColor Yellow
}
