# =============================================================================
#  menu.ps1 — Menú de l'Arbre de Fites · Dolçaina i Tabalet
#
#  No s'executa a mà: es llança amb arbre.bat (doble clic) des de l'arrel.
#  Tot el que fa és cridar `node crear_topics.js` amb els flags adequats; ací
#  no hi ha cap lògica de dades pròpia, tret de la importació del CSV.
# =============================================================================

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

$Arrel = Split-Path -Parent $PSScriptRoot
Set-Location $Arrel

$Csv       = Join-Path $Arrel 'GiT_nodes.csv'
$Copies    = Join-Path $Arrel 'copies'
$Informes  = Join-Path $Arrel 'copies\informes'
$Baixades  = Join-Path $HOME 'Downloads'

# ─── Utilitats de pantalla ───────────────────────────────────────────────────

function Titol($text) {
  Write-Host ''
  Write-Host ('  ' + $text) -ForegroundColor Yellow
  Write-Host ('  ' + ('─' * $text.Length)) -ForegroundColor DarkYellow
  Write-Host ''
}

function Pausa {
  Write-Host ''
  Write-Host '  Prem una tecla per a tornar al menú...' -ForegroundColor DarkGray
  # ReadKey peta si l'entrada està redirigida (proves, canonades). Si no hi ha
  # consola de veritat, no esperem res i seguim.
  try {
    if (-not [Console]::IsInputRedirected) { [void][Console]::ReadKey($true) }
  } catch {
    Start-Sleep -Milliseconds 300
  }
}

# Executa node i torna NOMÉS el codi d'eixida.
# L'`Out-Host` és imprescindible: sense ell, la sortida estàndard de Node se'n
# va a la canonada i acaba dins de la variable que recull el codi d'eixida, que
# aleshores és un array i falla qualsevol comparació amb 0.
function Node-Exec([string[]]$flags) {
  & node 'crear_topics.js' @flags | Out-Host
  return $global:LASTEXITCODE
}

function Comprovar-Entorn {
  if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
    Write-Host '  No trobe Node.js.' -ForegroundColor Red
    Write-Host '  Instal·la la versió LTS de https://nodejs.org i torna-ho a provar.'
    return $false
  }
  if (-not (Test-Path (Join-Path $Arrel 'config.json'))) {
    Write-Host '  Falta config.json.' -ForegroundColor Red
    Write-Host '  Sense ell no es pot fer res. Mira docs/USERGUIDE.md, Part B, pas 3.'
    return $false
  }
  return $true
}

# ─── 1. Importar el CSV més nou de Baixades ──────────────────────────────────

function Resum-Canvis($rutaNova) {
  # Deleguem la comparació a Node: ja sap parsejar aquest CSV bé.
  $script = Join-Path $PSScriptRoot 'comparar_csv.mjs'
  & node $script $Csv $rutaNova
}

# Es guarden les $MaxCopies últimes còpies del CSV i s'esborren les més velles.
# Amb 3 n'hi ha prou per a comparar amb l'anterior si algo ix malament, i evita
# que la carpeta cresca sense fi.
$MaxCopies = 3

function Fer-Copia {
  if (-not (Test-Path $Csv)) { return }
  if (-not (Test-Path $Copies)) { New-Item -ItemType Directory -Path $Copies | Out-Null }
  $marca = Get-Date -Format 'yyyyMMdd_HHmmss'
  $copia = Join-Path $Copies "GiT_nodes_$marca.csv"
  Copy-Item $Csv $copia
  Write-Host ('  Còpia de seguretat: copies\' + (Split-Path $copia -Leaf)) -ForegroundColor DarkGray

  $velles = Get-ChildItem -Path $Copies -Filter 'GiT_nodes_*.csv' -File |
            Sort-Object LastWriteTime -Descending | Select-Object -Skip $MaxCopies
  foreach ($v in $velles) {
    Remove-Item $v.FullName -Force
    Write-Host ('  Còpia antiga esborrada: ' + $v.Name) -ForegroundColor DarkGray
  }
}

# Tronc comú de les dues importacions: ensenya els canvis, demana confirmació,
# fa còpia de seguretat i valida. $origen és un fitxer ja a punt al disc.
function Aplicar-Import($origen, $descripcio) {
  if (Test-Path $Csv) {
    Write-Host '  Canvis respecte del CSV actual:' -ForegroundColor Cyan
    Write-Host ''
    Resum-Canvis $origen
  } else {
    Write-Host '  No hi ha cap CSV al projecte encara: aquest serà el primer.' -ForegroundColor Cyan
  }

  Write-Host ''
  $resposta = Read-Host '  Vols substituir el CSV del projecte? (s/N)'
  if ($resposta -ne 's' -and $resposta -ne 'S') {
    Write-Host '  Cancel·lat. No s''ha tocat res.' -ForegroundColor DarkGray
    return
  }

  Fer-Copia
  Copy-Item $origen $Csv -Force
  Write-Host ('  CSV importat des de ' + $descripcio + '.') -ForegroundColor Green
  Write-Host ''
  Write-Host '  Validant les dades noves...' -ForegroundColor Cyan
  Write-Host ''
  [void](Node-Exec @('--validate'))
}

function Importar-Full {
  Titol 'Importar del full de càlcul'

  $temporal = Join-Path $env:TEMP ('git_nodes_full_' + [guid]::NewGuid().ToString('N') + '.csv')
  & node (Join-Path $PSScriptRoot 'baixar_full.mjs') $temporal | Out-Host
  if ($LASTEXITCODE -ne 0) {
    Write-Host ''
    Write-Host '  No s''ha pogut baixar el full. No s''ha tocat res.' -ForegroundColor Red
    return
  }

  Write-Host ''
  try {
    Aplicar-Import $temporal 'el full de càlcul'
  } finally {
    if (Test-Path $temporal) { Remove-Item $temporal -Force }
  }
}

function Importar-Csv {
  Titol 'Importar un CSV de Baixades'

  if (-not (Test-Path $Baixades)) {
    Write-Host "  No trobe la carpeta de Baixades: $Baixades" -ForegroundColor Red
    return
  }

  $candidat = Get-ChildItem -Path $Baixades -Filter 'GiT_nodes*.csv' -File -ErrorAction SilentlyContinue |
              Sort-Object LastWriteTime -Descending | Select-Object -First 1

  if (-not $candidat) {
    Write-Host "  No hi ha cap GiT_nodes*.csv a $Baixades" -ForegroundColor Red
    Write-Host '  Exporta el full de càlcul com a CSV i torna-ho a provar.'
    return
  }

  Write-Host ('  Fitxer:  ' + $candidat.Name)
  Write-Host ('  Data:    ' + $candidat.LastWriteTime.ToString('yyyy-MM-dd HH:mm'))
  Write-Host ('  Mida:    ' + [math]::Round($candidat.Length / 1KB, 1) + ' KB')
  Write-Host ''

  Aplicar-Import $candidat.FullName $candidat.Name
}

# ─── 2 i 3. Validar i regenerar ──────────────────────────────────────────────

function Validar {
  Titol 'Validar les dades'
  $codi = Node-Exec @('--validate')
  Write-Host ''
  if ($codi -eq 0) { Write-Host '  Cap error. Es pot publicar.' -ForegroundColor Green }
  else             { Write-Host '  Hi ha errors: arregla el full abans de publicar.' -ForegroundColor Red }
}

function Regenerar {
  Titol 'Regenerar l''arbre (nodes.json)'
  Write-Host '  Això NO toca el fòrum ni GitHub: només el fitxer local.' -ForegroundColor DarkGray
  Write-Host ''
  [void](Node-Exec @('--only-nodes'))
}

# ─── 4. Veure l'arbre ────────────────────────────────────────────────────────

function Veure-Arbre {
  Titol 'Veure l''arbre al navegador'
  Write-Host '  Òbric un servidor local al port 3111.'
  Write-Host '  Per a parar-lo, tanca la finestra negra que s''obrirà.' -ForegroundColor DarkGray
  Write-Host ''
  Start-Process -FilePath 'cmd.exe' `
                -ArgumentList '/c', 'npx --yes serve . -l 3111' `
                -WorkingDirectory $Arrel
  Start-Sleep -Seconds 3
  Start-Process 'http://localhost:3111'
  Write-Host '  Obert. Si el navegador diu que no hi ha res, espera uns segons i recarrega.'
}

# ─── 5 i 6. Publicar ─────────────────────────────────────────────────────────

function Assaig {
  Titol 'Assaig de publicació'
  Write-Host '  Et diu què passaria. NO toca ni el fòrum ni GitHub.' -ForegroundColor DarkGray
  Write-Host ''
  [void](Node-Exec @('--dry-run'))
}

function Publicar {
  Titol 'PUBLICAR al fòrum i a GitHub'
  Write-Host '  ATENCIÓ: això escriu al fòrum públic de L''Ardada i fa un commit' -ForegroundColor Red
  Write-Host '  al repositori. No es desfà amb comoditat.' -ForegroundColor Red
  Write-Host ''
  Write-Host '  Primer, l''assaig:' -ForegroundColor Cyan
  Write-Host ''
  $codi = Node-Exec @('--dry-run')
  if ($codi -ne 0) {
    Write-Host ''
    Write-Host '  La validació ha fallat. No es pot publicar fins que ho arregles.' -ForegroundColor Red
    return
  }
  Write-Host ''
  Write-Host '  Si el que has llegit és el que vols, escriu PUBLICAR (en majúscules).'
  $resposta = Read-Host '  Confirmació'
  if ($resposta -cne 'PUBLICAR') {
    Write-Host '  Cancel·lat. No s''ha tocat res.' -ForegroundColor DarkGray
    return
  }
  Write-Host ''
  [void](Node-Exec @())
}

# ─── 7. Informe d'incidències ────────────────────────────────────────────────

function Informe {
  Titol 'Informe d''incidències'

  if (-not (Test-Path $Informes)) { New-Item -ItemType Directory -Path $Informes -Force | Out-Null }
  $marca  = Get-Date -Format 'yyyyMMdd_HHmmss'
  $fitxer = Join-Path $Informes "informe_$marca.txt"

  $capcalera = @(
    "Informe d'incidencies - Arbre de Fites",
    "Generat: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
    ("-" * 64),
    ""
  )

  # Volem avisos i errors al fitxer, i eixos van a stderr: cal ajuntar els dos
  # fluxos. Fer-ho amb `2>&1` des de PowerShell 5.1 NO serveix: embolcalla cada
  # línia de stderr en un ErrorRecord (NativeCommandError), que amb
  # ErrorActionPreference='Stop' peta, i que en convertir-lo a text dona
  # «System.Management.Automation.RemoteException» en lloc del missatge.
  # Deixant que ho faça cmd, PowerShell rep text pla i ja està.
  $sortida = cmd /c 'node crear_topics.js --validate 2>&1'
  $codi = $LASTEXITCODE

  ($capcalera + $sortida) | Set-Content -Path $fitxer -Encoding utf8

  $sortida | ForEach-Object { Write-Host $_ }
  Write-Host ''
  if ($codi -eq 0) { Write-Host '  Sense errors.' -ForegroundColor Green }
  else             { Write-Host '  Hi ha errors. Mira els suggeriments de dalt.' -ForegroundColor Red }
  Write-Host ('  Guardat a: copies\informes\' + (Split-Path $fitxer -Leaf)) -ForegroundColor DarkGray
  Write-Host ''
  $resposta = Read-Host '  Vols obrir-lo? (s/N)'
  if ($resposta -eq 's' -or $resposta -eq 'S') { Start-Process notepad.exe $fitxer }
}

# ─── 9. Insígnies ────────────────────────────────────────────────────────────

function Insignies {
  Titol 'Insígnies: quines falten i quin id tenen'
  Write-Host '  Creua les fites del full amb les insígnies del fòrum.' -ForegroundColor DarkGray
  Write-Host '  No toca res: només consulta.' -ForegroundColor DarkGray
  Write-Host ''
  & node (Join-Path $PSScriptRoot 'insignies.mjs') | Out-Host
  if ($LASTEXITCODE -ne 0) {
    Write-Host ''
    Write-Host '  No s''ha pogut consultar el fòrum.' -ForegroundColor Red
    return
  }
  $fitxer = Join-Path $Arrel 'badges_nous.csv'
  if (Test-Path $fitxer) {
    Write-Host ''
    $resposta = Read-Host '  Vols obrir badges_nous.csv? (s/N)'
    if ($resposta -eq 's' -or $resposta -eq 'S') { Start-Process notepad.exe $fitxer }
  }
}

# ─── Menú ────────────────────────────────────────────────────────────────────

function Menu {
  Clear-Host
  Write-Host ''
  Write-Host '   ARBRE DE FITES · Dolçaina i Tabalet' -ForegroundColor Yellow
  Write-Host '   Ateneu L''Ardada' -ForegroundColor DarkYellow
  Write-Host ''
  Write-Host '   ── Dades ──────────────────────────────────' -ForegroundColor DarkGray
  Write-Host '   1. Importar del full de càlcul'
  Write-Host '   2. Validar les dades'
  Write-Host '   3. Regenerar l''arbre (nodes.json)'
  Write-Host '   7. Informe d''incidències (i guardar-lo)'
  Write-Host '   9. Insígnies: quines falten i quin id tenen'
  Write-Host '   8. Importar un CSV de Baixades (reserva)' -ForegroundColor DarkGray
  Write-Host ''
  Write-Host '   ── Provar ─────────────────────────────────' -ForegroundColor DarkGray
  Write-Host '   4. Veure l''arbre al navegador'
  Write-Host '   5. Assaig de publicació (no toca res)'
  Write-Host ''
  Write-Host '   ── Publicar ───────────────────────────────' -ForegroundColor DarkGray
  Write-Host '   6. PUBLICAR al fòrum i a GitHub' -ForegroundColor Red
  Write-Host ''
  Write-Host '   0. Eixir'
  Write-Host ''

  if (Test-Path $Csv) {
    $data = (Get-Item $Csv).LastWriteTime.ToString('yyyy-MM-dd HH:mm')
    Write-Host "   CSV del projecte: $data" -ForegroundColor DarkGray
  } else {
    Write-Host '   No hi ha GiT_nodes.csv al projecte. Comença per l''opció 1.' -ForegroundColor Red
  }
  Write-Host ''
}

# ─── Bucle principal ─────────────────────────────────────────────────────────

if (-not (Comprovar-Entorn)) { Pausa; exit 1 }

while ($true) {
  Menu
  $opcio = Read-Host '   Opció'
  switch ($opcio) {
    '1' { Importar-Full; Pausa }
    '2' { Validar;       Pausa }
    '3' { Regenerar;     Pausa }
    '4' { Veure-Arbre;   Pausa }
    '5' { Assaig;        Pausa }
    '6' { Publicar;      Pausa }
    '7' { Informe;       Pausa }
    '8' { Importar-Csv;  Pausa }
    '9' { Insignies;     Pausa }
    '0' { Write-Host ''; exit 0 }
    default {
      Write-Host '   Opció no vàlida.' -ForegroundColor Red
      Start-Sleep -Milliseconds 900
    }
  }
}
