#!/bin/bash
# Generate stub screens so the foundation compiles before screen work begins.
cd "$(dirname "$0")/../src/screens" || exit 1
stub() { # name, id, title
  [ -f "$1.tsx" ] && return
  cat > "$1.tsx" <<EOF
import { ScrollPage, useTopBar } from '../shell/AppShell'
import { EmptyState } from '../components/ui'
import { Construction } from 'lucide-react'

/** $2 · $3 — STUB (to be built) */
export function $1(_props: Record<string, unknown>) {
  useTopBar([{ label: '$3' }])
  return <ScrollPage><EmptyState icon={<Construction />} title="$2 · $3" body="Wireframe in progress." /></ScrollPage>
}
EOF
}
stub RolesList S-02 "Roles"
stub RoleEditor S-03 "New role"
stub RolePage S-04 "Role"
stub CandidatesList S-05 "Candidates"
stub NewCandidate S-06 "New candidate"
stub CandidateProfile S-07 "Candidate"
stub MaskedBuilder S-09 "Masked resume"
stub TailoredReview S-10 "Tailored resume"
stub ResumesLibrary S-11 "Resumes"
stub ActivityLog S-12 "Activity"
stub SettingsPage S-13 "Settings"
stub WireframeIndex IDX "Screen index"
