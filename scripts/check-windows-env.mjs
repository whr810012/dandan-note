import { execSync } from 'node:child_process'
import { existsSync } from 'node:fs'

function hasCommand(command) {
  try {
    const output = execSync(`where ${command}`, { stdio: ['ignore', 'pipe', 'ignore'] })
      .toString()
      .trim()
    return output.length > 0 ? output : null
  } catch {
    return null
  }
}

function getOutput(command) {
  try {
    return execSync(command, { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  } catch {
    return null
  }
}

function checkRegistry(path) {
  try {
    execSync(`reg query "${path}"`, { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

function printStatus(label, ok, detail) {
  console.log(`${ok ? '[OK]' : '[MISSING]'} ${label} - ${detail}`)
}

function getVsDevCmd() {
  const vswhere = 'C:\\Program Files (x86)\\Microsoft Visual Studio\\Installer\\vswhere.exe'
  if (!existsSync(vswhere)) return null

  const installationPath = getOutput(
    `"${vswhere}" -latest -products * -requires Microsoft.VisualStudio.Component.VC.Tools.x86.x64 -property installationPath -format value`,
  )

  if (!installationPath) return null

  const candidate = `${installationPath}\\Common7\\Tools\\VsDevCmd.bat`
  return existsSync(candidate) ? candidate : null
}

const nodeVersion = getOutput('node --version')
const npmVersion = getOutput('npm --version')
const rustcVersion = getOutput('rustc --version')
const cargoVersion = getOutput('cargo --version')
const clPath = hasCommand('cl.exe')
const linkPath = hasCommand('link.exe')
const vsDevCmd = getVsDevCmd()
const webView2 =
  checkRegistry('HKLM\\SOFTWARE\\Microsoft\\EdgeUpdate\\Clients\\{F1E7C1A0-5D4C-4B0D-9A7D-3D7C8404C5B4}') ||
  checkRegistry('HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall\\Microsoft EdgeWebView')

printStatus('Node.js', Boolean(nodeVersion), nodeVersion ?? 'not installed')
printStatus('npm', Boolean(npmVersion), npmVersion ?? 'not installed')
printStatus('rustc', Boolean(rustcVersion), rustcVersion ?? 'not installed')
printStatus('cargo', Boolean(cargoVersion), cargoVersion ?? 'not installed')
printStatus('MSVC cl.exe', Boolean(clPath), clPath ?? 'not in PATH (ok if Dev Command is ready)')
printStatus('MSVC link.exe', Boolean(linkPath), linkPath ?? 'not in PATH (ok if Dev Command is ready)')
printStatus('Visual Studio Dev Command', Boolean(vsDevCmd), vsDevCmd ?? 'C++ workload not detected')
printStatus('WebView2 Runtime', webView2, webView2 ? 'installed' : 'not detected')

const msvcReady = Boolean(vsDevCmd) || (Boolean(clPath) && Boolean(linkPath))
const basicsReady = Boolean(nodeVersion && npmVersion && rustcVersion && cargoVersion)

if (!basicsReady || !msvcReady) {
  console.log('')
  console.log('Missing requirements. Install with:')
  console.log('  npm run env:install-cpp')
  console.log('Then reopen the terminal and run:')
  console.log('  npm run env:check')
  process.exit(1)
}

console.log('')
console.log('Windows desktop build environment is ready.')
console.log('Next:')
console.log('  npm run desktop:dev')
console.log('  npm run desktop:build')
console.log('  npm run desktop:run')
