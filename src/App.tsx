import { lazy, Suspense } from "react";
import { Loading } from "./features/training/shared";
import { Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { AppShell } from "@/components/app/app-shell";
import { RequireAuth } from "@/components/app/require-auth";
import JournalPage from "./features/journal/JournalPage";
import SessionEditorPage from "./features/journal/SessionEditorPage";
import TechniquesPage from "./features/techniques/TechniquesPage";
import TechniqueEditorPage from "./features/techniques/TechniqueEditorPage";
import ReviewPage from "./features/techniques/ReviewPage";
import ProgressPage from "./features/progress/ProgressPage";
import CoachPage from "./features/coach/CoachPage";
import SettingsPage from "./features/settings/SettingsPage";

const TodayPage = lazy(() => import("./features/training/TodayPage"));

const DraftsPage = lazy(() => import("./features/training/DraftsPage"));

const DraftPage = lazy(() => import("./features/training/DraftPage"));

const GameplanPage = lazy(() => import("./features/training/GameplanPage"));

const ExplorePage = lazy(() => import("./features/training/ExplorePage"));

export default function App() {
  return (
    <RequireAuth>
      <AppShell>
        <Suspense fallback={<Loading />}><Routes>
          <Route path="/" element={<TodayPage />} />
          <Route path="/journal" element={<JournalPage />} />
          <Route path="/drafts" element={<DraftsPage />} />
          <Route path="/drafts/:id" element={<DraftPage />} />
          <Route path="/gameplan" element={<GameplanPage />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/coach/:id" element={<CoachPage />} />
          <Route path="/session/new" element={<SessionEditorPage />} />
          <Route path="/session/:id" element={<SessionEditorPage />} />
          <Route path="/techniques" element={<TechniquesPage />} />
          <Route path="/techniques/new" element={<TechniqueEditorPage />} />
          <Route path="/techniques/:id" element={<TechniqueEditorPage />} />
          <Route path="/review" element={<ReviewPage />} />
          <Route path="/progress" element={<ProgressPage />} />
          <Route path="/coach" element={<CoachPage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Routes></Suspense>
        <Toaster position="top-center" />
      </AppShell>
    </RequireAuth>
  );
}
