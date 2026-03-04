import React, { useState } from 'react';
import { useNavigate } from 'react-router';
import { useApp } from '../../contexts/AppContext';
import { Navigation } from '../layout/Navigation';
import { AdministrateurDashboard } from './AdministrateurDashboard';
// TantieSagesse v1 supprimé — remplacé par la FAB flottante dans AppLayout

export function AdministrateurHome() {
  const navigate = useNavigate();
  const { user, speak } = useApp();
  
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isStatsExpanded, setIsStatsExpanded] = useState(false);
  const [showUtilisateursModal, setShowUtilisateursModal] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [showRapportModal, setShowRapportModal] = useState(false);

  // Stats mockées pour l'administrateur
  const stats = {
    utilisateurs: 1247,
    transactions: 3854,
    volume: 42500000,
  };

  const handleListenMessage = () => {
    const message = `Bonjour ${user?.firstName} ! Supervise la plateforme JULABA`;
    speak(message);
  };

  const handleTantieSagesseClick = () => {
    // v1 supprimé — Tantie s'ouvre via la FAB flottante dans AppLayout
  };

  return (
    <>
      <AdministrateurDashboard
        user={user}
        stats={stats}
        isSpeaking={isSpeaking}
        isStatsExpanded={isStatsExpanded}
        setIsStatsExpanded={setIsStatsExpanded}
        handleListenMessage={handleListenMessage}
        setShowUtilisateursModal={setShowUtilisateursModal}
        setShowTransactionsModal={setShowTransactionsModal}
        setShowRapportModal={setShowRapportModal}
        speak={speak}
        navigate={navigate}
      />

      <Navigation role="institution" onMicClick={handleTantieSagesseClick} />
    </>
  );
}