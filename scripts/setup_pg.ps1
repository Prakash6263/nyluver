$pgDir = "d:\prakash\postgresql"
if (!(Test-Path $pgDir)) { 
    Write-Output "Creating directory $pgDir..."
    New-Item -ItemType Directory -Path $pgDir -Force 
}

$zipPath = "$pgDir\postgresql-binaries.zip"
$extractPath = "$pgDir\binaries"

if (!(Test-Path $zipPath) -and !(Test-Path "$extractPath\pgsql\bin\postgres.exe")) {
    Write-Output "Downloading PostgreSQL 16.3..."
    curl.exe -L -o $zipPath https://get.enterprisedb.com/postgresql/postgresql-16.3-1-windows-x64-binaries.zip
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to download PostgreSQL"
        exit 1
    }
}

if (!(Test-Path "$extractPath\pgsql\bin\postgres.exe")) {
    Write-Output "Extracting PostgreSQL using tar..."
    if (!(Test-Path $extractPath)) { New-Item -ItemType Directory -Path $extractPath -Force }
    tar.exe -xf $zipPath -C $extractPath
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to extract PostgreSQL"
        exit 1
    }
}

$binPath = "$extractPath\pgsql\bin"
$dataPath = "$pgDir\data"

if (!(Test-Path $dataPath)) {
    Write-Output "Initializing database..."
    # Initialize with trust authentication so no password is required locally for user postgres
    & "$binPath\initdb.exe" -D $dataPath -U postgres --auth=trust
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to initialize database"
        exit 1
    }
}

Write-Output "Starting PostgreSQL..."
# Start the database server
& "$binPath\pg_ctl.exe" -D $dataPath -l "$pgDir\pg_log.txt" start
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to start PostgreSQL"
    exit 1
}

# Wait for database server to start
Start-Sleep -Seconds 5

Write-Output "Creating database nyluver..."
# Create the database nyluver, ignore if it already exists
& "$binPath\createdb.exe" -U postgres nyluver 2>$null

Write-Output "PostgreSQL setup completed successfully and running!"
