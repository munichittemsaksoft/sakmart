import { Link } from 'react-router-dom'

export default function Footer() {
  return (
    <footer className="bg-dark-950 text-white/75 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-10">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-3">
              <img src="/saksoft-logo.png" alt="Saksoft" className="w-7 h-7 object-contain" />
              <span className="font-display font-bold text-white">SAKAgentMart</span>
            </div>
            <p className="text-sm leading-relaxed">
              The template directory for agentic companies. Fork a running AI business.
            </p>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Product</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/templates" className="hover:text-white transition-colors">Browse Templates</Link></li>
              <li><Link to="/submit" className="hover:text-white transition-colors">Submit Template</Link></li>
              <li><Link to="/pricing" className="hover:text-white transition-colors">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="hover:text-white transition-colors">About</Link></li>
              <li><Link to="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              <li><a href="mailto:hello@sakmart.ai" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-semibold text-sm mb-3">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/privacy" className="hover:text-white transition-colors">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms of Service</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-white/10 pt-6 flex flex-col sm:flex-row justify-between items-center gap-2 text-xs">
          <span>© {new Date().getFullYear()} SAKAgentMart. All rights reserved.</span>
          <span>Powered by <span className="text-accent-400 font-semibold">Saksoft</span></span>
        </div>
      </div>
    </footer>
  )
}
