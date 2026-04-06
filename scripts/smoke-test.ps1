param(
  [Parameter(Mandatory=$true)]
  [string]$BaseUrl,

  [Parameter(Mandatory=$false)]
  [string]$SellerEmail = "seller+smoke@luxauto.test",

  [Parameter(Mandatory=$false)]
  [string]$BuyerEmail = "buyer+smoke@luxauto.test",

  [Parameter(Mandatory=$false)]
  [string]$Password = "Password123!",

  [Parameter(Mandatory=$false)]
  [string]$ImagePath1,

  [Parameter(Mandatory=$false)]
  [string]$ImagePath2
)

$ErrorActionPreference = 'Stop'

# Windows PowerShell (5.x) may default to older TLS versions.
try {
  [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
} catch {
  # ignore
}

function Join-Url([string]$a, [string]$b) {
  return ($a.TrimEnd('/') + '/' + $b.TrimStart('/'))
}

function Post-Json([string]$url, $body, [string]$token = $null) {
  $headers = @{}
  if ($token) { $headers['Authorization'] = "Bearer $token" }
  return Invoke-RestMethod -Method Post -Uri $url -Headers $headers -ContentType 'application/json' -Body ($body | ConvertTo-Json -Depth 10)
}

function Get-Json([string]$url, [string]$token = $null) {
  $headers = @{}
  if ($token) { $headers['Authorization'] = "Bearer $token" }
  return Invoke-RestMethod -Method Get -Uri $url -Headers $headers
}

function Patch-Json([string]$url, $body, [string]$token = $null) {
  $headers = @{}
  if ($token) { $headers['Authorization'] = "Bearer $token" }
  return Invoke-RestMethod -Method Patch -Uri $url -Headers $headers -ContentType 'application/json' -Body ($body | ConvertTo-Json -Depth 10)
}

Write-Host "== LuxAuto smoke test ==" -ForegroundColor Cyan
Write-Host "BaseUrl: $BaseUrl" -ForegroundColor Cyan

# Preflight
try {
  $health = Invoke-RestMethod -Method Get -Uri (Join-Url $BaseUrl '/')
  Write-Host "Health OK." -ForegroundColor Green
} catch {
  Write-Host "Cannot reach backend at $BaseUrl" -ForegroundColor Red
  Write-Host "- If local: start it with 'cd backend; npm run start:dev'" -ForegroundColor Yellow
  Write-Host "- If Railway: verify the public URL and that the service is running" -ForegroundColor Yellow
  exit 2
}

# 1) Register (ignore if already exists)
try {
  $sellerReg = Post-Json (Join-Url $BaseUrl '/auth/register') @{ email=$SellerEmail; password=$Password; role='SELLER'; name='Smoke Seller' }
} catch {
  Write-Host "(seller register) continuing: $($_.Exception.Message)" -ForegroundColor Yellow
}

try {
  $buyerReg = Post-Json (Join-Url $BaseUrl '/auth/register') @{ email=$BuyerEmail; password=$Password; role='BUYER'; name='Smoke Buyer' }
} catch {
  Write-Host "(buyer register) continuing: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 2) Login
try {
  $sellerLogin = Post-Json (Join-Url $BaseUrl '/auth/login') @{ email=$SellerEmail; password=$Password }
  $buyerLogin  = Post-Json (Join-Url $BaseUrl '/auth/login') @{ email=$BuyerEmail; password=$Password }
} catch {
  Write-Host "Login failed. Check credentials and backend logs." -ForegroundColor Red
  throw
}

$sellerToken = $sellerLogin.accessToken
$buyerToken  = $buyerLogin.accessToken

if (-not $sellerToken -or -not $buyerToken) {
  throw "Login did not return accessToken"
}

# 3) /auth/me
$sellerMe = Get-Json (Join-Url $BaseUrl '/auth/me') $sellerToken
$buyerMe  = Get-Json (Join-Url $BaseUrl '/auth/me') $buyerToken

Write-Host "Seller: $($sellerMe.email) role=$($sellerMe.role)" -ForegroundColor Green
Write-Host "Buyer : $($buyerMe.email) role=$($buyerMe.role)" -ForegroundColor Green

# 4) Create car
$car = Post-Json (Join-Url $BaseUrl '/cars') @{
  brand='Toyota'
  model='Corolla'
  year=2016
  mileage=85000
  fuel='GASOLINE'
  transmission='AUTOMATIC'
  price=9500
  location='Buenos Aires'
  bodyType='SEDAN'
  color='Black'
  ownersCount=2
  description='Smoke test listing'
} $sellerToken

$carId = $car.id
if (-not $carId) { throw "Create car did not return id" }
Write-Host "Created car: $carId" -ForegroundColor Green

# 5) Upload images (optional)
if ($ImagePath1) {
  if (-not (Test-Path $ImagePath1)) { throw "ImagePath1 not found: $ImagePath1" }
  $uploadUrl = Join-Url $BaseUrl ("/cars/$carId/images")

  $args = @(
    '-sS',
    '-X', 'POST',
    $uploadUrl,
    '-H', "Authorization: Bearer $sellerToken",
    '-F', ("images=@" + $ImagePath1)
  )
  if ($ImagePath2) {
    if (-not (Test-Path $ImagePath2)) { throw "ImagePath2 not found: $ImagePath2" }
    $args += @('-F', ("images=@" + $ImagePath2))
  }

  Write-Host "Uploading image(s)..." -ForegroundColor Cyan
  & curl.exe @args | Out-Host
}

# 6) Analyze (only meaningful if images exist)
try {
  $analysis = Post-Json (Join-Url $BaseUrl ("/cars/$carId/analyze")) @{} $sellerToken
  Write-Host "AI analysis overall_condition=$($analysis.overall_condition)" -ForegroundColor Green
} catch {
  Write-Host "(analyze) continuing: $($_.Exception.Message)" -ForegroundColor Yellow
}

# 7) Public list + detail
$cars = Get-Json (Join-Url $BaseUrl '/cars?page=1&limit=5')
$detail = Get-Json (Join-Url $BaseUrl ("/cars/$carId"))
Write-Host "List OK. Detail images=$($detail.images.Count) aiAnalysis=$([bool]$detail.aiAnalysis)" -ForegroundColor Green

# 8) Q&A create as buyer
$q = Post-Json (Join-Url $BaseUrl ("/cars/$carId/questions")) @{ text='¿Tiene detalles visibles?' } $buyerToken
$qId = $q.id
Write-Host "Created question: $qId" -ForegroundColor Green

# 9) Seller answers
$a = Post-Json (Join-Url $BaseUrl ("/questions/$qId/answer")) @{ text='Sí: pequeños rayones en el paragolpes.' } $sellerToken
Write-Host "Answered question: $($a.id)" -ForegroundColor Green

# 10) Notifications polling basics
$sellerUnread = Get-Json (Join-Url $BaseUrl '/notifications/unread-count') $sellerToken
$buyerUnread  = Get-Json (Join-Url $BaseUrl '/notifications/unread-count') $buyerToken
Write-Host "Unread seller=$($sellerUnread.count) buyer=$($buyerUnread.count)" -ForegroundColor Green

$buyerNotifs = Get-Json (Join-Url $BaseUrl '/notifications?page=1&limit=5') $buyerToken
Write-Host "Buyer notifications fetched." -ForegroundColor Green

Write-Host "== Smoke test completed ==" -ForegroundColor Cyan
