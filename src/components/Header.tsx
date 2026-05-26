/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Zap } from 'lucide-react';

interface HeaderProps {
  activeTab: 'converter' | 'editor';
  setActiveTab: (tab: 'converter' | 'editor') => void;
  onShowPrivacyModal: () => void;
  onShowHowItWorksModal: () => void;
  onReset: () => void;
}

export default function Header({ 
  activeTab, 
  setActiveTab, 
  onShowPrivacyModal, 
  onShowHowItWorksModal, 
  onReset 
 }: HeaderProps) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-gray-100/60 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-10">
        
        {/* Left Side: Gradient Circle Logo with Bolt and Name "pixsy" */}
        <button 
          id="btn-logo"
          onClick={() => {
            setActiveTab('converter');
            onReset();
          }}
          className="group flex items-center gap-1.5 sm:gap-2 text-left focus:outline-none cursor-pointer"
        >
          <div className="w-7.5 h-7.5 sm:w-8 h-8 rounded-xl bg-gradient-to-tr from-[#7653F8] to-[#997FFF] flex items-center justify-center transition-transform duration-300 group-hover:scale-105 shadow-sm shadow-[#7653F8]/30">
            <Zap className="h-4 w-4 sm:h-4.5 sm:w-4.5 text-white fill-white" />
          </div>
          <div>
            <span className="font-sans text-[15px] sm:text-[17px] font-black tracking-tight text-neutral-900">
              pixsy
            </span>
          </div>
        </button>

        {/* Center: Extremely Clean Menu */}
        <nav className="flex items-center gap-4 sm:gap-8">
          <button
            id="menu-image-dropdown"
            onClick={() => setActiveTab('converter')}
            className={`text-xs sm:text-[13px] font-semibold transition-all focus:outline-none cursor-pointer relative py-1 flex items-center gap-1 ${
              activeTab === 'converter' 
                ? 'text-[#7653F8]' 
                : 'text-gray-400 hover:text-black'
            }`}
          >
            Image
            {activeTab === 'converter' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7653F8] rounded-full" />
            )}
          </button>
          
          <button
            id="menu-editor"
            onClick={() => setActiveTab('editor')}
            className={`text-xs sm:text-[13px] font-semibold transition-all focus:outline-none cursor-pointer relative py-1 flex items-center gap-1 ${
              activeTab === 'editor' 
                ? 'text-[#7653F8]' 
                : 'text-gray-400 hover:text-black'
            }`}
          >
            Editor
            {activeTab === 'editor' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#7653F8] rounded-full" />
            )}
          </button>
        </nav>

        {/* Right Side: GitHub Profile Capsule */}
        <div className="flex items-center">
          {/* Connected GitHub User capsule styled button like the mock */}
          <a
            id="cta-github-profile"
            href="https://github.com/hellomoksedul"
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-1.5 px-2 py-1.5 sm:px-3 rounded-full border border-gray-200 bg-white hover:bg-gray-50/50 hover:border-gray-300 text-gray-700 transition-all duration-200 text-xs font-semibold focus:outline-none"
            title="Built by @hellomoksedul"
          >
            <svg className="w-3.5 h-3.5 text-gray-500 group-hover:text-black shrink-0" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.042-1.416-4.042-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
            </svg>
            <span className="hidden sm:inline text-gray-600 group-hover:text-black">hellomoksedul</span>
          </a>
        </div>

      </div>
    </header>
  );
}
