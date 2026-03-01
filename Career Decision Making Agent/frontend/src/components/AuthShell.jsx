import { motion } from 'framer-motion'
import { Link, useLocation } from 'react-router-dom'

export default function AuthShell({ title, subtitle, children }) {
  const location = useLocation()
  const isLogin = location.pathname === '/login'

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between p-12 bg-gradient-to-b from-blue-50 to-slate-50 border-r border-slate-200">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-semibold">A</div>
          <div className="text-sm font-semibold text-slate-900">AI Specialization Pro</div>
        </div>

        <div className="max-w-lg">
          <div className="text-5xl font-semibold leading-[1.05] text-slate-900">
            Shape Your Future with
            <span className="text-blue-600"> Intelligence</span>.
          </div>
          <div className="mt-5 text-sm text-slate-600">
            Join thousands of students using AI to navigate the complex landscape of technology careers.
          </div>

          <div className="mt-8 space-y-4">
            <div className="flex gap-3">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 text-sm font-semibold">AI</div>
              <div>
                <div className="text-sm font-semibold text-slate-900">AI-Driven Precision</div>
                <div className="mt-0.5 text-xs text-slate-600">Our neural engine analyzes your skills to find high-probability matches.</div>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 text-sm font-semibold">RM</div>
              <div>
                <div className="text-sm font-semibold text-slate-900">Dynamic Roadmaps</div>
                <div className="mt-0.5 text-xs text-slate-600">Get a customized learning plan for every specialization you consider.</div>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-xl bg-blue-100 text-blue-700 text-sm font-semibold">MI</div>
              <div>
                <div className="text-sm font-semibold text-slate-900">Market Insights</div>
                <div className="mt-0.5 text-xs text-slate-600">Stay ahead with role stability and automation risk signals.</div>
              </div>
            </div>
          </div>

          <div className="mt-10 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="h-48 rounded-2xl bg-gradient-to-br from-slate-100 to-blue-50 border border-slate-200" />
          </div>
        </div>

        <div className="text-xs text-slate-500">Your data stays private. No keys are stored in the frontend.</div>
      </div>

      <div className="flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-sm p-7"
        >
          <div className="text-center">
            <div className="text-2xl font-semibold text-slate-900">{title}</div>
            {subtitle ? <div className="mt-1 text-sm text-slate-500">{subtitle}</div> : null}
          </div>

          <div className="mt-6 rounded-xl bg-slate-50 p-1 grid grid-cols-2 gap-1">
            <Link
              to="/login"
              className={
                isLogin
                  ? 'rounded-lg bg-white border border-slate-200 py-2 text-sm font-semibold text-slate-900 text-center'
                  : 'rounded-lg py-2 text-sm font-semibold text-slate-500 hover:text-slate-900 text-center'
              }
            >
              Login
            </Link>
            <Link
              to="/signup"
              className={
                !isLogin
                  ? 'rounded-lg bg-white border border-slate-200 py-2 text-sm font-semibold text-slate-900 text-center'
                  : 'rounded-lg py-2 text-sm font-semibold text-slate-500 hover:text-slate-900 text-center'
              }
            >
              Sign Up
            </Link>
          </div>

          <div className="mt-6">{children}</div>

          <div className="mt-6 text-xs text-center text-slate-500">
            Your data is secured with enterprise-grade encryption.
          </div>
        </motion.div>
      </div>
    </div>
  )
}
