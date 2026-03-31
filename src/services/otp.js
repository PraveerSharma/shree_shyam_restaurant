// ============================================
// OTP SERVICE (FREE PRODUCTION SIMULATION)
// ============================================

import { showToast } from '../utils/dom.js';

const OTP_SESSION_KEY = 'ssr_otp_data';
const OTP_EXPIRY = 5 * 60 * 1000; // 5 minutes

/**
 * Generate and "send" a 6-digit OTP
 * @param {string} phone - The user's phone number
 */
export function sendOTP(phone) {
  // Generate a 6-digit code
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  
  const otpData = {
    phone,
    code,
    timestamp: Date.now(),
    expires: Date.now() + OTP_EXPIRY
  };
  
  sessionStorage.setItem(OTP_SESSION_KEY, JSON.stringify(otpData));
  
  // === FREE OTP OPTION (Simulation) ===
  // Note: This is 100% free. In a paid environment, this would call 
  // an API like Twilio/Firebase.
  console.log(`[SECURE OTP] Code for ${phone}: ${code}`);
  
  // Enhanced simulation delay & UI feedback
  setTimeout(() => {
    showToast(`
      <div style="display:flex;align-items:center;gap:12px;">
        <span style="font-size:1.5rem;">📱</span>
        <div>
          <div style="font-weight:700;">SMS to ${phone}</div>
          <div style="font-size:0.85rem;margin-top:2px;">Your Shree Shyam OTP is: <strong style="font-size:1.1rem;color:var(--clr-saffron);letter-spacing:1px;">${code}</strong></div>
        </div>
      </div>
    `, 'success', 10000);
  }, 1200);

  return { success: true };
}

/**
 * Verify if the provided code matches the one sent
 * @param {string} phone - The phone number to verify
 * @param {string} inputCode - The code entered by the user
 */
export function verifyOTP(phone, inputCode) {
  try {
    const stored = JSON.parse(sessionStorage.getItem(OTP_SESSION_KEY));
    
    if (!stored || stored.phone !== phone) {
      return { success: false, error: 'No active verification session found. Please resend OTP.' };
    }
    
    if (Date.now() > stored.expires) {
      sessionStorage.removeItem(OTP_SESSION_KEY);
      return { success: false, error: 'OTP has expired. Please request a new one.' };
    }
    
    if (stored.code === inputCode) {
      sessionStorage.removeItem(OTP_SESSION_KEY); // Security: Use only once
      return { success: true };
    }
    
    return { success: false, error: 'Incorrect OTP code. Please try again.' };
  } catch (err) {
    return { success: false, error: 'Verification failed. Please try again.' };
  }
}
