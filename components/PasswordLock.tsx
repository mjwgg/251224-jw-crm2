import React, { useState, useEffect } from 'react';
import { EyeIcon, EyeOffIcon } from './icons';
import { hashPassword } from '../services/cryptoService';

interface PasswordLockProps {
  onUnlock: () => void;
}

const PasswordLock: React.FC<PasswordLockProps> = ({ onUnlock }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const initialAuthPassed = localStorage.getItem('initial_auth_passed') === 'true';
    const lockEnabled = localStorage.getItem('app_lock_enabled') === 'true';
    
    // 초기 인증을 통과했고, 사용자가 잠금 기능을 비활성화한 경우에만 자동으로 잠금 해제
    if (initialAuthPassed && !lockEnabled) {
      onUnlock();
    }
  }, [onUnlock]);


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const initialAuthPassed = localStorage.getItem('initial_auth_passed') === 'true';

    if (initialAuthPassed) {
      // 이미 초기 인증을 통과한 경우, 사용자가 설정한 비밀번호로 확인
      const storedHash = localStorage.getItem('app_password_hash');
      if (!storedHash) {
        // 사용자가 잠금을 활성화했지만 해시가 없는 경우 (이론적으로는 드문 경우)
        onUnlock();
        return;
      }
      const enteredHash = await hashPassword(password);
      if (enteredHash === storedHash) {
        onUnlock();
      } else {
        setError('비밀번호가 틀렸습니다.');
        setPassword('');
      }
    } else {
      // 최초 실행 시, 초기 비밀번호('m0416')로 확인
      if (password === 'm0416') {
        localStorage.setItem('initial_auth_passed', 'true');
        const hash = await hashPassword('m0416');
        localStorage.setItem('app_password_hash', hash);
        localStorage.setItem('app_lock_enabled', 'true');
        onUnlock();
      } else {
        setError('초기 비밀번호가 올바르지 않습니다.');
        setPassword('');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-[var(--background-primary)] z-[200] flex items-center justify-center p-4">
      <div className="w-full max-w-sm mx-auto bg-[var(--background-secondary)] p-8 rounded-2xl shadow-2xl border border-[var(--border-color)]">
        <h1 className="text-2xl font-bold text-center text-[var(--text-primary)] mb-2">비밀번호 입력</h1>
        <p className="text-center text-[var(--text-muted)] mb-6">앱에 접근하려면 비밀번호를 입력해주세요.</p>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="비밀번호"
              className="w-full px-4 py-3 border border-[var(--border-color-strong)] rounded-lg bg-[var(--background-tertiary)] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:outline-none focus:ring-2 focus:ring-[var(--background-accent)] text-lg tracking-widest text-center"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center px-4 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
            >
              {showPassword ? <EyeOffIcon className="h-6 w-6" /> : <EyeIcon className="h-6 w-6" />}
            </button>
          </div>
          {error && <p className="text-center text-sm text-[var(--text-danger)]">{error}</p>}
          <button
            type="submit"
            className="w-full py-3 px-4 bg-[var(--background-accent)] text-[var(--text-on-accent)] font-semibold rounded-lg hover:bg-[var(--background-accent-hover)] transition-colors disabled:opacity-50"
            disabled={!password}
          >
            확인
          </button>
        </form>
      </div>
    </div>
  );
};

export default PasswordLock;
