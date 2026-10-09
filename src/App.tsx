import { useState, useEffect } from 'react';
import { Sender } from './components/Sender';
import { Receiver } from './components/Receiver';
import { QrCode, Smartphone, Send, Download, Monitor, Shield, Zap, WifiOff, Layout, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import { Capacitor } from '@capacitor/core';

// The installers are the assets of the matching GitHub release (tag v<version>), built with build_all.sh / electron-builder.
// Keep APP_VERSION in sync with package.json when you publish a new release.
const APP_VERSION = '1.0.0';
const RELEASE_URL = `https://github.com/Avinashkumar8694/zero-cam-sharing/releases/download/v${APP_VERSION}`;
const FILE = {
  macArm: `FabrixlyCamSharing-${APP_VERSION}-mac-arm64.dmg`,
  macIntel: `FabrixlyCamSharing-${APP_VERSION}-mac-x64.dmg`,
  macArmZip: `FabrixlyCamSharing-${APP_VERSION}-mac-arm64.zip`,
  macIntelZip: `FabrixlyCamSharing-${APP_VERSION}-mac-x64.zip`,
  winSetup: `FabrixlyCamSharing-Setup-${APP_VERSION}-x64.exe`,
  winZip: `FabrixlyCamSharing-${APP_VERSION}-win-x64.zip`,
  appImage: `FabrixlyCamSharing-${APP_VERSION}-linux-x86_64.AppImage`,
  deb: `FabrixlyCamSharing-${APP_VERSION}-linux-amd64.deb`,
  apk: `FabrixlyCamSharing-${APP_VERSION}-android.apk`,
  sums: 'SHA256SUMS',
};
const dl = (file: string) => `${RELEASE_URL}/${file}`;
const altLink = 'text-xs text-slate-400 hover:text-white underline underline-offset-2 transition';

// Declare electronAPI globally
declare global {
  interface Window {
    electronAPI: {
      saveFile: (data: { data: string; name: string }) => Promise<{ success: boolean; filePath?: string; error?: string }>;
      readFile: (filePath: string) => Promise<{ success: boolean; data?: string; name?: string; size?: number; error?: string }>;
      openFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
    };
  }
}


// Inside the desktop and Android apps there is nothing to download or to read about: it opens straight into Send / Receive.
function NativeHome({ onPick }: { onPick: (r: 'sender' | 'receiver') => void }) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-slate-200 px-6 py-10 font-sans">
      <div className="flex items-center gap-3 mb-3">
        <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-2 rounded-xl shadow-lg shadow-purple-500/20">
          <QrCode size={28} className="text-white" />
        </div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">Fabrixly Cam Sharing</h1>
      </div>
      <p className="text-slate-400 text-center max-w-sm mb-10">Send files between two screens with no network: one device shows QR codes, the other scans them with its camera.</p>
      <div className="w-full max-w-md flex flex-col gap-4">
        <button onClick={() => onPick('sender')} className="group rounded-2xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition p-6 flex items-center justify-between">
          <div className="flex items-center gap-4"><Send size={24} className="text-blue-400" /><div className="text-left"><h2 className="font-bold text-lg">Send a File</h2><p className="text-sm text-white/50">Show QR codes on this screen</p></div></div>
          <ChevronRight size={20} className="text-white/30 group-hover:text-white transition" />
        </button>
        <button onClick={() => onPick('receiver')} className="group rounded-2xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 transition p-6 flex items-center justify-between">
          <div className="flex items-center gap-4"><Download size={24} className="text-purple-400" /><div className="text-left"><h2 className="font-bold text-lg">Receive a File</h2><p className="text-sm text-white/50">Scan with this device&apos;s camera</p></div></div>
          <ChevronRight size={20} className="text-white/30 group-hover:text-white transition" />
        </button>
      </div>
      <p className="mt-10 text-xs text-slate-600">Version {APP_VERSION}</p>
    </div>
  );
}

const isNativeApp = () => !!window.electronAPI || Capacitor.isNativePlatform();

function App() {
  const [role, setRole] = useState<'home' | 'sender' | 'receiver'>('home');
  const [os, setOs] = useState<'mac' | 'win' | 'linux' | 'android' | 'unknown'>('unknown');

  useEffect(() => {
    const userAgent = window.navigator.userAgent.toLowerCase();
    if (userAgent.indexOf('android') !== -1) setOs('android');
    else if (userAgent.indexOf('mac') !== -1) setOs('mac');
    else if (userAgent.indexOf('win') !== -1) setOs('win');
    else if (userAgent.indexOf('linux') !== -1) setOs('linux');
  }, []);

  if (role === 'sender') return <Sender onBack={() => setRole('home')} />;
  if (role === 'receiver') return <Receiver onBack={() => setRole('home')} />;
  if (isNativeApp()) return <NativeHome onPick={setRole} />;

  const primaryDownload = {
    mac: { link: dl(FILE.macArm), label: 'Download for macOS', icon: <Monitor size={20} /> },
    win: { link: dl(FILE.winSetup), label: 'Download for Windows', icon: <Monitor size={20} /> },
    linux: { link: dl(FILE.appImage), label: 'Download for Linux', icon: <Monitor size={20} /> },
    android: { link: dl(FILE.apk), label: 'Download for Android', icon: <Smartphone size={20} /> },
    unknown: { link: '#downloads', label: 'View Downloads', icon: <Download size={20} /> }
  }[os];

  return (
    <div className="min-h-screen w-full flex flex-col bg-slate-950 text-slate-200 relative overflow-x-hidden selection:bg-purple-500/30 font-sans">
      
      {/* Dynamic Background */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[120px]" />
        <div className="absolute top-[20%] right-[-20%] w-[50%] h-[50%] bg-purple-600/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] left-[20%] w-[60%] h-[60%] bg-indigo-600/10 rounded-full blur-[120px]" />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-[0.03] mix-blend-overlay"></div>
      </div>

      {/* Navigation Bar */}
      <nav className="w-full fixed top-0 z-50 border-b border-white/5 bg-slate-950/50 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-gradient-to-br from-blue-500 to-purple-500 p-1.5 rounded-lg shadow-lg shadow-purple-500/20">
              <QrCode size={20} className="text-white" />
            </div>
            <span className="font-bold tracking-tight text-lg bg-clip-text text-transparent bg-gradient-to-r from-blue-100 to-white">Fabrixly Cam Sharing</span>
          </div>
          
          <div className="flex items-center gap-6 text-sm font-medium">
            <a href="#how-it-works" className="hidden sm:block text-slate-400 hover:text-white transition">How it Works</a>
            <a href="#features" className="hidden sm:block text-slate-400 hover:text-white transition">Features</a>
            <a href="#downloads" className="text-slate-400 hover:text-white transition">Downloads</a>
          </div>
        </div>
      </nav>

      {/* Main Content Container */}
      <main className="flex-1 relative z-10 pt-24 w-full">
        
        {/* HERO SECTION */}
        <section className="max-w-7xl mx-auto px-6 pt-20 pb-32 flex flex-col items-center text-center">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5, ease: "easeOut" }} className="mb-6 inline-flex items-center gap-2 px-3 py-1 rounded-full border border-purple-500/30 bg-purple-500/10 text-purple-300 text-xs font-semibold tracking-wide uppercase">
            <Zap size={14} /> Hardware Accelerated
          </motion.div>
          
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="text-5xl md:text-7xl font-extrabold tracking-tight mb-6 max-w-4xl text-balance">
            Zero-network file sharing via <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">visual QR codes.</span>
          </motion.h1>
          
          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.2 }} className="text-lg md:text-xl text-slate-400 max-w-2xl mb-10 text-balance">
            Transfer massive files securely between any two screens. No Wi-Fi, no Bluetooth, no cables. Just point your camera.
          </motion.p>
          
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }} className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto items-center">
            {os !== 'unknown' ? (
              <a href={primaryDownload.link} download className="group relative w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-slate-900 px-8 py-4 rounded-2xl font-bold text-lg transition hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.2)]">
                {primaryDownload.icon}
                {primaryDownload.label}
              </a>
            ) : (
              <a href="#downloads" className="group relative w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-slate-900 px-8 py-4 rounded-2xl font-bold text-lg transition hover:scale-105 shadow-[0_0_40px_rgba(255,255,255,0.2)]">
                {primaryDownload.icon}
                {primaryDownload.label}
              </a>
            )}
            
            <a href="#webapp" className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-800 text-white border border-slate-700 px-8 py-4 rounded-2xl font-bold text-lg transition hover:bg-slate-700 hover:scale-105">
              <Layout size={20} />
              Use Web App
            </a>
          </motion.div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="w-full border-y border-white/5 bg-slate-950/80 py-24">
          <div className="max-w-7xl mx-auto px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold mb-4">How it works</h2>
              <p className="text-slate-400">Three simple steps to securely bridge the airgap.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-slate-900 border border-white/5 rounded-3xl p-8 relative overflow-hidden group hover:border-purple-500/30 transition-colors">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-[50px]" />
                <div className="text-4xl font-black text-white/5 mb-4">01</div>
                <h3 className="text-xl font-bold mb-2">Select your file</h3>
                <p className="text-slate-400">Choose any file or document on the Sender device. Fabrixly compresses it instantly.</p>
              </div>
              <div className="bg-slate-900 border border-white/5 rounded-3xl p-8 relative overflow-hidden group hover:border-blue-500/30 transition-colors">
                <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-[50px]" />
                <div className="text-4xl font-black text-white/5 mb-4">02</div>
                <h3 className="text-xl font-bold mb-2">Scan the Code</h3>
                <p className="text-slate-400">The Sender rapidly flashes QR codes. Point the Receiver's camera at the screen.</p>
              </div>
              <div className="bg-slate-900 border border-white/5 rounded-3xl p-8 relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-[50px]" />
                <div className="text-4xl font-black text-white/5 mb-4">03</div>
                <h3 className="text-xl font-bold mb-2">Instantly Saved</h3>
                <p className="text-slate-400">Once all data frames are captured, the file is stitched together and saved directly to your disk.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURES */}
        <section id="features" className="max-w-7xl mx-auto px-6 py-24">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl font-bold mb-6">Designed for security and speed.</h2>
              <p className="text-slate-400 text-lg mb-8">
                Fabrixly leverages ultra-dense visual data transfer to completely bypass traditional networking channels.
              </p>
              
              <ul className="space-y-6">
                <li className="flex gap-4">
                  <div className="mt-1 bg-purple-500/20 text-purple-400 p-2 rounded-xl h-fit">
                    <WifiOff size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">100% Offline</h4>
                    <p className="text-slate-400">Requires no internet, no Wi-Fi network, and no Bluetooth pairing.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="mt-1 bg-emerald-500/20 text-emerald-400 p-2 rounded-xl h-fit">
                    <Shield size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">Airgapped Security</h4>
                    <p className="text-slate-400">The safest way to transfer files. Data never leaves the physical room you are in.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="mt-1 bg-blue-500/20 text-blue-400 p-2 rounded-xl h-fit">
                    <Zap size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg">Hardware Accelerated</h4>
                    <p className="text-slate-400">Utilizes the native BarcodeDetector API for 60-FPS frame decoding.</p>
                  </div>
                </li>
              </ul>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 bg-gradient-to-tr from-blue-500/20 to-purple-500/20 blur-[100px] -z-10" />
              <div className="glass-panel p-8 border border-white/10 shadow-2xl">
                 {/* WEB APP QUICK ACCESS */}
                <div id="webapp" className="w-full">
                  <h3 className="text-xl font-bold mb-6 text-center">Use Web App Now</h3>
                  <div className="flex flex-col gap-4">
                    <button 
                      onClick={() => setRole('sender')}
                      className="group relative overflow-hidden rounded-2xl border border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 transition-all duration-300 p-6 flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <Send size={24} className="text-blue-400" />
                        <div className="text-left">
                          <h4 className="font-bold text-lg">Send a File</h4>
                          <p className="text-sm text-white/50">Show QR codes on screen</p>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-white/30 group-hover:text-white transition" />
                    </button>
                    
                    <button 
                      onClick={() => setRole('receiver')}
                      className="group relative overflow-hidden rounded-2xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 transition-all duration-300 p-6 flex items-center justify-between cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <Download size={24} className="text-purple-400" />
                        <div className="text-left">
                          <h4 className="font-bold text-lg">Receive a File</h4>
                          <p className="text-sm text-white/50">Scan via webcam</p>
                        </div>
                      </div>
                      <ChevronRight size={20} className="text-white/30 group-hover:text-white transition" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* DOWNLOADS */}
        <section id="downloads" className="w-full bg-slate-900 border-t border-white/5 py-24">
          <div className="max-w-7xl mx-auto px-6 text-center">
            <h2 className="text-3xl font-bold mb-4">Download the Native Apps</h2>
            <p className="text-slate-400 mb-12 max-w-2xl mx-auto">Get the full Fabrixly experience with hardware-accelerated scanning, native file saving, and automatic history tracking on your platform.</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 max-w-5xl mx-auto">
              
              <div className="bg-slate-950 p-6 rounded-3xl border border-white/5 flex flex-col items-center">
                <div className="h-16 w-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6">
                  <Monitor size={32} className="text-gray-300" />
                </div>
                <h3 className="font-bold text-lg mb-1">macOS</h3>
                <p className="text-sm text-slate-500 mb-6">Apple Silicon & Intel</p>
                <a href={dl(FILE.macArm)} download className="mt-auto w-full py-3 bg-white/10 hover:bg-white/20 transition rounded-xl font-medium text-sm">Download DMG (Apple Silicon)</a>
                <div className="mt-3 flex flex-col items-center gap-1"><a href={dl(FILE.macIntel)} download className={altLink}>Intel Mac (.dmg)</a><a href={dl(FILE.macArmZip)} download className={altLink}>Apple Silicon (.zip)</a><a href={dl(FILE.macIntelZip)} download className={altLink}>Intel Mac (.zip)</a></div>
              </div>
              
              <div className="bg-slate-950 p-6 rounded-3xl border border-white/5 flex flex-col items-center">
                <div className="h-16 w-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6">
                  <Monitor size={32} className="text-blue-400" />
                </div>
                <h3 className="font-bold text-lg mb-1">Windows</h3>
                <p className="text-sm text-slate-500 mb-6">Windows 10/11</p>
                <a href={dl(FILE.winSetup)} download className="mt-auto w-full py-3 bg-white/10 hover:bg-white/20 transition rounded-xl font-medium text-sm">Download EXE installer</a>
                <div className="mt-3 flex flex-col items-center gap-1"><a href={dl(FILE.winZip)} download className={altLink}>Portable (.zip)</a></div>
              </div>

              <div className="bg-slate-950 p-6 rounded-3xl border border-white/5 flex flex-col items-center">
                <div className="h-16 w-16 bg-white/5 rounded-2xl flex items-center justify-center mb-6">
                  <Monitor size={32} className="text-orange-400" />
                </div>
                <h3 className="font-bold text-lg mb-1">Linux</h3>
                <p className="text-sm text-slate-500 mb-6">Ubuntu, Debian, Fedora</p>
                <a href={dl(FILE.appImage)} download className="mt-auto w-full py-3 bg-white/10 hover:bg-white/20 transition rounded-xl font-medium text-sm">Download AppImage</a>
                <div className="mt-3 flex flex-col items-center gap-1"><a href={dl(FILE.deb)} download className={altLink}>Debian / Ubuntu (.deb)</a></div>
              </div>

              <div className="bg-slate-950 p-6 rounded-3xl border border-white/5 flex flex-col items-center">
                <div className="h-16 w-16 bg-green-500/10 rounded-2xl flex items-center justify-center mb-6 border border-green-500/20">
                  <Smartphone size={32} className="text-green-500" />
                </div>
                <h3 className="font-bold text-lg mb-1">Android</h3>
                <p className="text-sm text-slate-500 mb-6">Android 9.0+</p>
                <a href={dl(FILE.apk)} download className="mt-auto w-full py-3 bg-green-500 hover:bg-green-400 text-slate-950 transition rounded-xl font-bold text-sm">Download APK</a>
              </div>

            </div>

            <p className="mt-8 text-sm text-slate-500">
              Version {APP_VERSION} · <a href={dl(FILE.sums)} className="underline underline-offset-2 hover:text-white">SHA256 checksums</a> · <a href={`https://github.com/Avinashkumar8694/zero-cam-sharing/releases/tag/v${APP_VERSION}`} className="underline underline-offset-2 hover:text-white" target="_blank" rel="noopener noreferrer">All builds and release notes</a>
            </p>
          </div>
        </section>

      </main>

      {/* FOOTER */}
      <footer className="w-full py-8 border-t border-white/10 text-center text-slate-500 text-sm z-10 bg-slate-950 relative">
        <p>© {new Date().getFullYear()} Fabrixly Cam Sharing. Designed with precision.</p>
      </footer>
    </div>
  );
}

export default App;
