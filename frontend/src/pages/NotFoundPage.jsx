import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
      <div className="w-20 h-20 rounded-2xl bg-primary-50 flex items-center justify-center mb-6">
        <span className="font-display font-extrabold text-4xl text-primary-500">?</span>
      </div>
      <h1 className="font-display font-bold text-4xl text-dark-950 mb-2">Page not found</h1>
      <p className="text-dark-700/60 mb-8 max-w-sm">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/" className="btn-primary px-6 py-2.5">Go home</Link>
    </div>
  )
}
