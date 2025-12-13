import React from 'react';

interface BrowserFrameProps {
  children: React.ReactNode;
  title?: string;
}

export const BrowserFrame: React.FC<BrowserFrameProps> = ({ children, title = 'Rancher Hub' }) => {
  return (
    <div className="w-full rounded-lg overflow-hidden shadow-2xl bg-gray-900">
      {/* Browser Chrome */}
      <div className="bg-gray-800 px-4 py-3 flex items-center gap-2 border-b border-gray-700">
        {/* Traffic Lights */}
        <div className="flex gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500" aria-hidden="true"></div>
          <div className="w-3 h-3 rounded-full bg-yellow-500" aria-hidden="true"></div>
          <div className="w-3 h-3 rounded-full bg-green-500" aria-hidden="true"></div>
        </div>
        {/* Address Bar */}
        <div className="flex-1 ml-4 bg-gray-700 rounded px-3 py-1 text-xs text-gray-400 font-mono">
          {title}
        </div>
      </div>
      {/* Browser Content */}
      <div className="bg-white">
        {children}
      </div>
    </div>
  );
};
