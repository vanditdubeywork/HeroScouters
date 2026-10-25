import React from 'react'
import ReactDOM from 'react-dom/client'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import './index.css'
import { AppStoreProvider, WireframeProvider } from './store/AppStore'
import { AppShell } from './shell/AppShell'
import { RolesList } from './screens/RolesList'
import { RoleEditor } from './screens/RoleEditor'
import { RolePage } from './screens/RolePage'
import { CandidatesList } from './screens/CandidatesList'
import { NewCandidate } from './screens/NewCandidate'
import { CandidateProfile } from './screens/CandidateProfile'
import { MaskedBuilder } from './screens/MaskedBuilder'
import { TailoredReview } from './screens/TailoredReview'
import { ResumesLibrary } from './screens/ResumesLibrary'
import { ActivityLog } from './screens/ActivityLog'
import { SettingsPage } from './screens/SettingsPage'
import { WireframeIndex } from './screens/WireframeIndex'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppStoreProvider>
      <WireframeProvider>
        <HashRouter>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<Navigate to="/roles" replace />} />
              <Route path="/roles" element={<RolesList />} />
              <Route path="/roles/new" element={<RoleEditor mode="new" />} />
              <Route path="/roles/:id/edit" element={<RoleEditor mode="edit" />} />
              <Route path="/roles/:id" element={<RolePage />} />
              <Route path="/candidates" element={<CandidatesList />} />
              <Route path="/candidates/new" element={<NewCandidate />} />
              <Route path="/candidates/:id" element={<CandidateProfile />} />
              <Route path="/resumes" element={<ResumesLibrary />} />
              <Route path="/resumes/masked" element={<MaskedBuilder />} />
              <Route path="/resumes/tailored" element={<TailoredReview />} />
              <Route path="/resumes/editable" element={<TailoredReview />} />
              <Route path="/activity" element={<ActivityLog />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/wireframes" element={<WireframeIndex />} />
              <Route path="*" element={<Navigate to="/roles" replace />} />
            </Route>
          </Routes>
        </HashRouter>
      </WireframeProvider>
    </AppStoreProvider>
  </React.StrictMode>,
)
