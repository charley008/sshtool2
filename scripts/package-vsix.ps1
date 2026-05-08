$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$pkg = Get-Content (Join-Path $root "package.json") -Raw | ConvertFrom-Json
$buildRoot = Join-Path $root "_vsix_build"
$extensionRoot = Join-Path $buildRoot "extension"
$vsixName = "$($pkg.name)-$($pkg.version).vsix"
$vsixPath = Join-Path $root $vsixName

if ((Test-Path $buildRoot) -and -not ((Resolve-Path $buildRoot).Path.StartsWith($root.Path))) {
  throw "Refusing to delete a build directory outside the workspace: $buildRoot"
}

if (Test-Path $buildRoot) {
  Remove-Item -LiteralPath $buildRoot -Recurse -Force
}
if (Test-Path $vsixPath) {
  Remove-Item -LiteralPath $vsixPath -Force
}

New-Item -ItemType Directory -Path $extensionRoot | Out-Null

$files = @(
  "package.json",
  "package.nls.json",
  "package.nls.zh-cn.json",
  "README.md",
  "CHANGELOG.md",
  "LICENSE.md"
)

foreach ($file in $files) {
  Copy-Item -LiteralPath (Join-Path $root $file) -Destination (Join-Path $extensionRoot $file)
}

foreach ($dir in @("out", "public", "resources")) {
  Copy-Item -LiteralPath (Join-Path $root $dir) -Destination (Join-Path $extensionRoot $dir) -Recurse
}

$contentTypes = @'
<?xml version="1.0" encoding="utf-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="json" ContentType="application/json" />
  <Default Extension="md" ContentType="text/markdown" />
  <Default Extension="js" ContentType="application/javascript" />
  <Default Extension="css" ContentType="text/css" />
  <Default Extension="html" ContentType="text/html" />
  <Default Extension="png" ContentType="image/png" />
  <Default Extension="svg" ContentType="image/svg+xml" />
  <Default Extension="woff" ContentType="font/woff" />
  <Default Extension="ico" ContentType="image/x-icon" />
  <Default Extension="txt" ContentType="text/plain" />
  <Default Extension="vsixmanifest" ContentType="text/xml" />
  <Override PartName="/extension.vsixmanifest" ContentType="text/xml" />
</Types>
'@

Set-Content -LiteralPath (Join-Path $buildRoot "[Content_Types].xml") -Value $contentTypes -Encoding UTF8

$tags = ($pkg.keywords -join ",")
$manifest = @"
<?xml version="1.0" encoding="utf-8"?>
<PackageManifest Version="2.0.0" xmlns="http://schemas.microsoft.com/developer/vsx-schema/2011" xmlns:d="http://schemas.microsoft.com/developer/vsx-schema-design/2011">
  <Metadata>
    <Identity Language="en-US" Id="$($pkg.name)" Version="$($pkg.version)" Publisher="$($pkg.publisher)" />
    <DisplayName>$($pkg.displayName)</DisplayName>
    <Description xml:space="preserve">$($pkg.description)</Description>
    <Tags>$tags</Tags>
    <Categories>$($pkg.categories -join ",")</Categories>
    <GalleryFlags>Public</GalleryFlags>
    <Properties>
      <Property Id="Microsoft.VisualStudio.Code.Engine" Value="$($pkg.engines.vscode)" />
      <Property Id="Microsoft.VisualStudio.Code.ExtensionKind" Value="workspace" />
      <Property Id="Microsoft.VisualStudio.Services.Links.Source" Value="$($pkg.repository.url)" />
      <Property Id="Microsoft.VisualStudio.Services.Links.Repository" Value="$($pkg.repository.url)" />
      <Property Id="Microsoft.VisualStudio.Services.Links.Support" Value="$($pkg.bugs.url)" />
      <Property Id="Microsoft.VisualStudio.Services.GitHubFlavoredMarkdown" Value="true" />
    </Properties>
    <License>extension/LICENSE.md</License>
    <Icon>extension/resources/images/ssh.png</Icon>
  </Metadata>
  <Installation>
    <InstallationTarget Id="Microsoft.VisualStudio.Code"/>
  </Installation>
  <Dependencies/>
  <Assets>
    <Asset Type="Microsoft.VisualStudio.Code.Manifest" Path="extension/package.json" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Content.Details" Path="extension/README.md" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Content.Changelog" Path="extension/CHANGELOG.md" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Content.License" Path="extension/LICENSE.md" Addressable="true" />
    <Asset Type="Microsoft.VisualStudio.Services.Icons.Default" Path="extension/resources/images/ssh.png" Addressable="true" />
  </Assets>
</PackageManifest>
"@

Set-Content -LiteralPath (Join-Path $buildRoot "extension.vsixmanifest") -Value $manifest -Encoding UTF8

Compress-Archive -Path (Join-Path $buildRoot "*") -DestinationPath $vsixPath -Force
Write-Host "Created $vsixPath"
