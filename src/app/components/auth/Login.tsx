import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router';
import { motion, AnimatePresence } from 'motion/react';
import { Mic, ArrowRight, Code, CheckCircle, Crown, Globe, MapPin, BarChart3, ShieldCheck, X, ChevronRight, Users, Zap } from 'lucide-react';
import { useApp, getMockUserByPhone, getAllMockUsers } from '../../contexts/AppContext';
import { useUser } from '../../contexts/UserContext';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { useBackOffice, MOCK_BO_USERS, BORoleType } from '../../contexts/BackOfficeContext';
import logoOrange from 'figma:asset/d4e25a0b05d3b69e7e79f65efbd03a87d4b68385.png';
import logoTonDje from 'figma:asset/c7cc70789b435fa844a3d9eb596e29ecf3d4f80c.png';
import logoJulaba from 'figma:asset/54872e2911223a687a64213d3c9b5c2dc0d3d160.png';
import tantieSagesseImg from 'figma:asset/41b92fac963891d143c08b39664bce7342b10a05.png';

const BO_PRIMARY = '#E6A817';
const BO_DARK = '#3B3C36';

const BO_ROLES: { role: BORoleType; label: string; desc: string; icon: any; color: string }[] = [
  { role: 'super_admin', label: 'Super Admin', desc: 'Accès total — toutes permissions', icon: Crown, color: '#E6A817' },
  { role: 'admin_national', label: 'Admin National', desc: 'Gestion nationale complète', icon: Globe, color: '#3B82F6' },
  { role: 'gestionnaire_zone', label: 'Gestionnaire Zone', desc: 'Zone Abidjan', icon: MapPin, color: '#10B981' },
  { role: 'analyste', label: 'Analyste', desc: 'Lecture seule — statistiques', icon: BarChart3, color: '#8B5CF6' },
];

export function Login() {
  const navigate = useNavigate();
  const { setUser: setAppUser } = useApp();
  const { setUser: setUserProfile } = useUser();
  const { setBOUser } = useBackOffice();
  const [phone, setPhone] = useState('');
  const [showOTP, setShowOTP] = useState(false);
  const [otp, setOtp] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [tantieSpeechText, setTantieSpeechText] = useState('Appuie sur moi pour me parler');
  const recognitionRef = useRef<any>(null);
  const hasSpokenWelcome = useRef(false);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const [voicesLoaded, setVoicesLoaded] = useState(false);
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // Dev panel state
  const [logoClickCount, setLogoClickCount] = useState(0);
  const [showDevPanel, setShowDevPanel] = useState(false);
  const [showBORoles, setShowBORoles] = useState(false);
  const [boLoading, setBoLoading] = useState<BORoleType | null>(null);
  const clickResetTimer = useRef<any>(null);
  const DEFAULT_OTP = '1234';

  const mockUsers = getAllMockUsers();

  // Charger les voix au démarrage
  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        voicesRef.current = voices;
        setVoicesLoaded(true);
        console.log('✅ Voix chargées:', voices.length);
        
        // Log des voix françaises disponibles
        const frenchVoices = voices.filter(v => v.lang.startsWith('fr'));
        console.log('🇫🇷 Voix françaises:', frenchVoices.length, frenchVoices.map(v => v.name));
      }
    };

    // Charger immédiatement
    loadVoices();

    // Écouter l'événement de chargement des voix
    if (window.speechSynthesis) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }

    return () => {
      if (window.speechSynthesis) {
        window.speechSynthesis.onvoiceschanged = null;
      }
    };
  }, []);

  // Fonction locale pour parler ET afficher le texte
  const speakWithText = (message: string) => {
    console.log('🔊 Tentative de parole:', message);
    
    // Mise à jour du texte immédiatement
    setTantieSpeechText(message);
    
    // Vérifier si la synthèse vocale est disponible
    if (!('speechSynthesis' in window)) {
      console.warn('❌ speechSynthesis non disponible');
      setTimeout(() => {
        setTantieSpeechText('Appuie sur moi pour me parler');
      }, message.length * 50);
      return;
    }
    
    // Annuler toute synthèse en cours
    try {
      window.speechSynthesis.cancel();
    } catch (e) {
      console.warn('⚠️ Erreur lors de cancel():', e);
    }
    
    // Attendre que les voix soient chargées ET un délai pour éviter les conflits
    const speakTimeout = setTimeout(() => {
      try {
        const utterance = new SpeechSynthesisUtterance(message);
        utterance.lang = 'fr-FR';
        utterance.rate = 0.9;
        utterance.volume = 1.0;
        utterance.pitch = 1.0;
        
        // Sauvegarder la référence
        utteranceRef.current = utterance;
        
        // Utiliser les voix en cache ou les recharger
        const voices = voicesRef.current.length > 0 ? voicesRef.current : window.speechSynthesis.getVoices();
        console.log('🎤 Voix disponibles:', voices.length);
        
        if (voices.length === 0) {
          console.warn('️ Aucune voix disponible, tentative sans voix spécifique');
        } else {
          const frenchVoice = voices.find(voice => voice.lang.startsWith('fr'));
          if (frenchVoice) {
            utterance.voice = frenchVoice;
            console.log('✅ Voix française sélectionnée:', frenchVoice.name);
          } else {
            console.warn('⚠️ Aucune voix française, utilisation voix par défaut');
          }
        }
        
        // Quand la voix termine
        utterance.onend = () => {
          console.log('✅ Parole terminée');
          setTimeout(() => {
            setTantieSpeechText('Appuie sur moi pour me parler');
          }, 500);
          utteranceRef.current = null;
        };
        
        // Gestion des erreurs améliorée
        utterance.onerror = (event: any) => {
          // Ne logger que les vraies erreurs, pas les interruptions normales
          if (event.error !== 'interrupted' && event.error !== 'canceled') {
            console.error('❌ Erreur synthèse vocale:', event.error);
            
            // Afficher un message d'erreur convivial pour les vraies erreurs
            let errorMsg = 'Erreur vocale';
            if (event.error === 'not-allowed') {
              errorMsg = 'Autorisation vocale requise';
            } else if (event.error === 'network') {
              errorMsg = 'Erreur réseau';
            }
            
            console.warn('💬 Message erreur:', errorMsg);
          }
          
          setTimeout(() => {
            setTantieSpeechText('Appuie sur moi pour me parler');
          }, 500);
          utteranceRef.current = null;
        };
        
        // Démarrer la voix
        utterance.onstart = () => {
          console.log('🎙️ Parole démarrée');
        };
        
        // Lancer la synthèse
        window.speechSynthesis.speak(utterance);
        console.log('✅ speak() appelé avec succès');
        
      } catch (e) {
        console.error('❌ Erreur lors de speak():', e);
        setTimeout(() => {
          setTantieSpeechText('Appuie sur moi pour me parler');
        }, 2000);
      }
    }, 200); // Délai de 200ms pour éviter les conflits
    
    // Nettoyer le timeout si le composant est démonté
    return () => clearTimeout(speakTimeout);
  };

  // Cleanup au démontage du composant
  useEffect(() => {
    return () => {
      // Arrêter toute synthèse vocale en cours
      if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
      // Arrêter la reconnaissance vocale
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // Ignorer les erreurs
        }
      }
    };
  }, []);

  // Announce OTP when switching to OTP screen
  useEffect(() => {
    if (showOTP) {
      speakWithText('Ton code OTP a été envoyé avec succès');
    }
  }, [showOTP]);

  const handlePhoneSubmit = () => {
    if (phone.length !== 10) {
      setError('Le numéro doit contenir 10 chiffres');
      speakWithText('Le numéro doit contenir 10 chiffres');
      return;
    }

    const user = getMockUserByPhone(phone);
    
    if (user) {
      speakWithText('Un code de vérification a été envoyé par SMS');
      setShowOTP(true);
      setError('');
    } else {
      setError('Ton numéro n\'est pas encore enregistré sur JULABA');
      speakWithText('Ton numéro n\'est pas encore enregistré sur JULABA');
    }
  };

  const handleOTPChange = (index: number, value: string) => {
    if (value.length > 1) return;
    
    const newOTP = [...otp];
    newOTP[index] = value;
    setOtp(newOTP);

    // Auto focus next input
    if (value && index < 3) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleOTPSubmit = () => {
    const otpCode = otp.join('');
    
    if (otpCode.length !== 4) {
      setError('Entre le code complet');
      speakWithText('Entre le code complet');
      return;
    }

    // Simulate OTP validation (accept any 6 digits for demo)
    const user = getMockUserByPhone(phone);
    
    if (user) {
      setAppUser(user);
      setUserProfile(user);
      speakWithText(`Bienvenue ${user.firstName}. Ton djè est calé`);
      
      // Navigate based on role
      setTimeout(() => {
        navigate(`/${user.role}`);
      }, 500);
    }
  };

  const handleMicClick = () => {
    if (!showOTP) {
      speakWithText(`Votre numéro saisi est ${phone}`);
    } else {
      speakWithText(`Le code entré est ${otp.join('')}`);
    }
  };

  const startListening = () => {
    if (!recognitionRef.current) {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      
      if (!SpeechRecognition) {
        speakWithText('Désolé, ton navigateur ne supporte pas la reconnaissance vocale');
        return;
      }
      
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.lang = 'fr-FR';
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = true;
    }

    speakWithText('C\'est bon je t\'écoute, dis-moi ton numéro lentement');

    recognitionRef.current.onstart = () => {
      setIsListening(true);
    };

    recognitionRef.current.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript.toLowerCase().replace(/\s/g, '');
      
      if (showOTP) {
        // Extract digits for OTP
        const digits = transcript.match(/\d/g);
        if (digits && digits.length >= 4) {
          const newOtp = digits.slice(0, 4);
          setOtp(newOtp);
        }
      } else {
        // Extract digits for phone number (progressive)
        const digits = transcript.match(/\d/g);
        if (digits) {
          const phoneNumber = digits.join('').slice(0, 10);
          setPhone(phoneNumber);
          
          // Auto submit when 10 digits reached
          if (phoneNumber.length === 10) {
            setTimeout(() => {
              const user = getMockUserByPhone(phoneNumber);
              if (user) {
                speakWithText('Un code de vérification a été envoyé par SMS');
                setShowOTP(true);
                setError('');
              } else {
                setError('Ton numéro n\'est pas encore enregistré sur JULABA');
                speakWithText('Ton numéro n\'est pas encore enregistré sur JULABA');
              }
            }, 500);
          }
        }
      }
    };

    recognitionRef.current.onerror = () => {
      setIsListening(false);
      speakWithText('Je n\'entends rien, tu peux aussi taper ton numéro directement');
    };

    recognitionRef.current.onend = () => {
      setIsListening(false);
    };

    try {
      recognitionRef.current.start();
    } catch (e) {
      setIsListening(false);
      speakWithText('Je n\'entends rien, tu peux aussi taper ton numéro directement');
    }
  };

  const handleTantieSagesse = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    if (!showOTP) {
      startListening();
    } else {
      // Read OTP code and offer dictation
      speakWithText(`Ton code OTP est ${DEFAULT_OTP.split('').join(' ')}. Tu peux aussi me dicter ton code si tu veux`);
      setTimeout(() => {
        startListening();
      }, 7000); // Wait for speech to finish
    }
  };

  // Format phone number with spaces: "07 01 02 03 04"
  const formatPhoneNumber = (value: string) => {
    const cleaned = value.replace(/\D/g, '');
    const formatted = cleaned.match(/.{1,2}/g)?.join(' ') || cleaned;
    return formatted;
  };

  const handleLogoClick = () => {
    // Reset timer on each click
    if (clickResetTimer.current) clearTimeout(clickResetTimer.current);

    const newCount = logoClickCount + 1;
    setLogoClickCount(newCount);

    if (newCount >= 5) {
      setLogoClickCount(0);
      setShowDevPanel(true);
      setShowBORoles(false);
    } else {
      // Reset count after 3 seconds of inactivity
      clickResetTimer.current = setTimeout(() => setLogoClickCount(0), 3000);
    }
  };

  const handleProfileSwitch = (userPhone: string) => {
    const user = getMockUserByPhone(userPhone);
    if (user) {
      setAppUser(user);
      setUserProfile(user);
      setShowDevPanel(false);
      setTimeout(() => { navigate(`/${user.role}`); }, 300);
    }
  };

  const handleBOAccess = async (role: BORoleType) => {
    setBoLoading(role);
    await new Promise(r => setTimeout(r, 350));
    const user = MOCK_BO_USERS.find(u => u.role === role);
    if (user) {
      setBOUser(user);
      setShowDevPanel(false);
      navigate('/backoffice/dashboard');
    }
    setBoLoading(null);
  };

  return (
    <div className="min-h-screen bg-[#C46210] flex flex-col items-center justify-start pt-32 p-6 relative">

      <div className="w-full max-w-md">
        {/* Logo — cliquer 5 fois pour ouvrir le panneau DEV */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <motion.img
            src={logoJulaba}
            alt="JULABA"
            className="h-20 w-auto mx-auto cursor-pointer select-none"
            onClick={handleLogoClick}
            animate={
              logoClickCount > 0 && logoClickCount < 5
                ? { rotate: [0, -4, 4, -4, 4, 0], scale: [1, 1.05, 1] }
                : {}
            }
            transition={{ duration: 0.4 }}
            whileTap={{ scale: 0.92 }}
          />
          {/* Indicateur de progression (points discrets) */}
          <AnimatePresence>
            {logoClickCount > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex justify-center gap-1 mt-2"
              >
                {[...Array(5)].map((_, i) => (
                  <motion.div
                    key={i}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: i < logoClickCount ? 'white' : 'rgba(255,255,255,0.3)' }}
                    animate={i < logoClickCount ? { scale: [1, 1.5, 1] } : {}}
                    transition={{ duration: 0.3 }}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Form Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-3xl shadow-lg p-8"
        >
          {/* Logo "Ton djè est calé" */}
          <div className="flex justify-center mb-6">
            
          </div>

          {!showOTP ? (
            // Phone Input
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Connexion</h2>
              <p className="text-gray-600 mb-4">Entre ton numéro de téléphone</p>

              {/* Phone Input avec préfixe +225 */}
              <div className="relative mb-2">
                <div className="flex items-center h-14 border-2 border-gray-200 rounded-2xl overflow-hidden focus-within:border-[#C46210] transition-colors bg-white">
                  {/* Préfixe +225 fixe avec fond orange et texte blanc */}
                  <span 
                    className="h-full flex items-center px-4 text-lg font-medium select-none text-white"
                    style={{ backgroundColor: '#C46210' }}
                  >
                    +225
                  </span>
                  
                  {/* Input du numéro */}
                  <input
                    type="tel"
                    value={formatPhoneNumber(phone)}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                      setPhone(value);
                      setError('');
                    }}
                    placeholder="07 01 02 03 04"
                    className="flex-1 h-full px-3 text-lg outline-none border-none bg-transparent"
                    inputMode="numeric"
                  />
                  
                  {/* Icône de validation verte */}
                  {phone.length === 10 && (
                    <motion.div
                      initial={{ scale: 0, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                      className="pr-3"
                    >
                      <CheckCircle className="w-6 h-6 text-green-500" />
                    </motion.div>
                  )}
                </div>
              </div>

              {/* Message d'aide OTP */}
              <p className="text-xs text-gray-500 mb-4">
                Tu recevras un code à 4 chiffres
              </p>

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-500 text-sm mb-4"
                >
                  {error}
                </motion.p>
              )}

              <Button
                onClick={handlePhoneSubmit}
                className="w-full h-14 rounded-2xl text-lg font-semibold"
                style={{ backgroundColor: '#C46210' }}
              >
                Continuer
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>

              {error && error.includes('pas encore enregistré') && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 p-4 rounded-2xl bg-amber-50 border-2 border-amber-200"
                >
                  <p className="text-sm font-bold text-amber-800 text-center">
                    Ce numéro n'est pas encore enregistré sur JULABA.
                  </p>
                  <p className="text-xs text-amber-700 text-center mt-1">
                    Seul un agent identificateur ou Administrateur Système peut créer votre compte. Contactez votre agent JÙLABA.
                  </p>
                </motion.div>
              )}
            </div>
          ) : (
            // OTP Input
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Code de vérification</h2>
              <p className="text-gray-600 mb-6">Entre le code reçu par SMS</p>

              <div className="flex gap-2 mb-4">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="tel"
                    value={digit}
                    onChange={(e) => handleOTPChange(index, e.target.value)}
                    className="w-full h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-2xl focus:border-[#C46210] focus:outline-none transition-colors"
                    maxLength={1}
                    inputMode="numeric"
                  />
                ))}
              </div>

              {error && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-red-500 text-sm mb-4"
                >
                  {error}
                </motion.p>
              )}

              <Button
                onClick={handleOTPSubmit}
                className="w-full h-14 rounded-2xl text-lg font-semibold"
                style={{ backgroundColor: '#C46210' }}
              >
                Valider
              </Button>

              <button
                onClick={() => setShowOTP(false)}
                className="w-full mt-4 text-gray-600 hover:text-gray-900 transition-colors"
              >
                Modifier le numéro
              </button>
            </div>
          )}
        </motion.div>

        {/* Help Text */}
        <p className="text-center text-white/90 mt-6 font-bold text-[20px]">
          Plateforme nationale d'inclusion économique des acteurs vivriers
        </p>
      </div>

      {/* Link to onboarding - Fixed at bottom */}
      <div className="absolute bottom-6 text-center w-full left-0 px-6">
        <button
          onClick={() => {
            localStorage.removeItem('julaba_skip_onboarding');
            navigate('/onboarding');
          }}
          className="text-white text-sm font-medium hover:underline"
        >
          Revoir le tutoriel
        </button>
      </div>

      {/* Tantie Sagesse FAB */}
      <motion.button
        onClick={handleTantieSagesse}
        className="fixed left-1/2 -translate-x-1/2 flex items-center justify-center rounded-full transition-all"
        style={{ 
          bottom: '140px',
          width: '120px',
          height: '120px',
        }}
        animate={{ 
          y: [0, -8, 0],
          scale: [1, 1.05, 1]
        }}
        transition={{ 
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {/* Permanent subtle pulse */}
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{ backgroundColor: '#C46210' }}
          animate={{ 
            scale: [1, 1.5, 1],
            opacity: [0.3, 0, 0.3]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />

        {/* Strong pulse when listening */}
        <AnimatePresence>
          {isListening && (
            <>
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: '#C46210' }}
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 2.5, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, repeat: Infinity }}
              />
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: '#C46210' }}
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 3, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
              />
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{ backgroundColor: '#C46210' }}
                initial={{ scale: 1, opacity: 0.6 }}
                animate={{ scale: 3.5, opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
              />
            </>
          )}
        </AnimatePresence>

        <motion.div
          animate={isListening ? { 
            scale: [1, 1.3, 1],
            rotate: [0, 5, -5, 0]
          } : { 
            scale: [1, 1.1, 1]
          }}
          transition={{ 
            duration: isListening ? 0.6 : 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative z-10 w-full h-full rounded-full overflow-hidden"
        >
          <img 
            src={tantieSagesseImg} 
            alt="Tantie Sagesse" 
            className="w-full h-full object-cover"
          />
        </motion.div>
      </motion.button>

      {/* Texte dynamique sous Tantie Sagesse */}
      <motion.p
        className="fixed left-1/2 -translate-x-1/2 text-center text-white font-medium text-xs px-4 max-w-xs whitespace-nowrap"
        style={{ bottom: '110px' }}
        animate={{ opacity: [0.8, 1, 0.8] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        {tantieSpeechText}
      </motion.p>

      {/* Panneau DEV — déclenché par 5 clics sur le logo */}
      <AnimatePresence>
        {showDevPanel && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => { setShowDevPanel(false); setShowBORoles(false); }}
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0, y: 30 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.85, opacity: 0, y: 30 }}
              transition={{ type: 'spring', stiffness: 280, damping: 22 }}
              onClick={e => e.stopPropagation()}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 max-h-[88vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-purple-100 flex items-center justify-center">
                    <Code className="w-6 h-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-black text-gray-900">Mode Developpeur</p>
                    <p className="text-xs text-gray-500">Changer de profil rapidement</p>
                  </div>
                </div>
                <motion.button
                  onClick={() => { setShowDevPanel(false); setShowBORoles(false); }}
                  className="w-10 h-10 rounded-2xl bg-gray-100 flex items-center justify-center"
                  whileHover={{ scale: 1.1, backgroundColor: '#FEE2E2' }}
                  whileTap={{ scale: 0.9 }}
                >
                  <X className="w-5 h-5 text-gray-600" />
                </motion.button>
              </div>

              {/* Profils utilisateurs */}
              <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Profils App</p>
              <div className="space-y-2 mb-5">
                {mockUsers.map((user) => {
                  const roleColors: Record<string, { bg: string; border: string; text: string }> = {
                    marchand: { bg: '#FEF3C7', border: '#F59E0B', text: '#92400E' },
                    producteur: { bg: '#D1FAE5', border: '#10B981', text: '#065F46' },
                    cooperative: { bg: '#DBEAFE', border: '#3B82F6', text: '#1E3A8A' },
                    institution: { bg: '#F3E8FF', border: '#A855F7', text: '#6B21A8' },
                    identificateur: { bg: '#FED7AA', border: '#F97316', text: '#9A3412' },
                  };
                  const colors = roleColors[user.role] || roleColors.marchand;
                  return (
                    <motion.button
                      key={user.id}
                      onClick={() => handleProfileSwitch(user.phone)}
                      className="w-full p-3 rounded-2xl border-2 flex items-center justify-between text-left"
                      style={{ backgroundColor: colors.bg, borderColor: colors.border }}
                      whileHover={{ scale: 1.02, y: -1 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center font-bold"
                          style={{ backgroundColor: colors.border, color: 'white' }}>
                          {user.firstName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900 text-sm">{user.firstName} {user.lastName}</p>
                          <p className="text-xs font-semibold capitalize" style={{ color: colors.text }}>{user.role}</p>
                        </div>
                      </div>
                      <p className="text-xs font-bold" style={{ color: colors.text }}>Score: {user.score}</p>
                    </motion.button>
                  );
                })}
              </div>

              {/* Séparateur + Back-Office */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">Administration</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <AnimatePresence mode="wait">
                {!showBORoles ? (
                  <motion.button
                    key="btn-bo"
                    initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }}
                    onClick={() => setShowBORoles(true)}
                    className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 text-left"
                    style={{ backgroundColor: `${BO_DARK}08`, borderColor: `${BO_DARK}30`, borderStyle: 'dashed' }}
                    whileHover={{ borderColor: BO_PRIMARY, backgroundColor: `${BO_PRIMARY}10`, scale: 1.01 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                      style={{ backgroundColor: BO_PRIMARY }}>
                      <ShieldCheck className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-gray-900">Back-Office Central</p>
                      <p className="text-xs text-gray-500">Acces admin instantane</p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </motion.button>
                ) : (
                  <motion.div
                    key="panel-bo"
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    className="rounded-2xl border-2 overflow-hidden"
                    style={{ backgroundColor: BO_DARK, borderColor: `${BO_PRIMARY}50` }}
                  >
                    <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                        <p className="text-xs font-bold text-white">Choisir un role</p>
                      </div>
                      <motion.button onClick={() => setShowBORoles(false)} className="text-white/40 hover:text-white/80" whileTap={{ scale: 0.9 }}>
                        <X className="w-4 h-4" />
                      </motion.button>
                    </div>
                    <div className="p-3 space-y-2">
                      {BO_ROLES.map(({ role, label, desc, icon: Icon, color }) => {
                        const isLoading = boLoading === role;
                        return (
                          <motion.button
                            key={role}
                            onClick={() => handleBOAccess(role)}
                            disabled={boLoading !== null}
                            className="w-full flex items-center gap-3 p-3 rounded-xl border text-left"
                            style={{ borderColor: `${color}35`, backgroundColor: `${color}12` }}
                            whileHover={{ borderColor: color, scale: 1.01 }}
                            whileTap={{ scale: 0.97 }}
                          >
                            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                              style={{ backgroundColor: `${color}25` }}>
                              {isLoading
                                ? <motion.div className="w-4 h-4 border-2 border-t-transparent rounded-full"
                                    style={{ borderColor: `${color}50`, borderTopColor: color }}
                                    animate={{ rotate: 360 }} transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }} />
                                : <Icon className="w-4 h-4" style={{ color }} />
                              }
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm" style={{ color }}>{label}</p>
                              <p className="text-[10px] text-white/40">{desc}</p>
                            </div>
                            <Zap className="w-4 h-4 flex-shrink-0" style={{ color: `${color}50` }} />
                          </motion.button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-4 p-3 bg-gray-50 rounded-2xl">
                <p className="text-[11px] text-center text-gray-400">
                  Panneau dev — 5 clics sur le logo pour reafficher
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}