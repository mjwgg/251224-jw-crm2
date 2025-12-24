
import React from 'react';
import BaseModal from './ui/BaseModal';
import { XIcon, CalculatorIcon } from './icons';

interface PensionCalculatorsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CALCULATORS = [
    { name: '국민연금 계산기', url: 'https://www.nps.or.kr/comm/quick/getOHAH0011P0.do' },
    { name: '미래에셋 연금계산기', url: 'https://securities.miraeasset.com/mw/mkp/mkp2009/c02.do' },
    { name: 'IBK 연금 계산기', url: 'https://www.ibki.co.kr/process/HP_INDYANTY_PREMCACL_POP' },
    { name: 'KDB생명 연금계산기', url: 'https://csfa.kdblife.co.kr/csfa/pp/CS_PPM100M100.do?noncache=2025117155053' },
    { name: 'IM라이프 연금계산기', url: 'https://www.imlifeins.co.kr/www/BC/AnnInsCalc.do' },
    { name: '하나생명 연금계산기', url: 'https://sales.hanalife.co.kr/evt/anCalc/pt/onlyOneVarView.do' },
];

const PensionCalculatorsModal: React.FC<PensionCalculatorsModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-md w-full">
      <div className="p-4 border-b border-[var(--border-color)] flex justify-between items-center">
        <h2 className="text-xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            <CalculatorIcon className="h-6 w-6 text-[var(--text-accent)]" />
            보험사별 연금계산기
        </h2>
        <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
          <XIcon className="h-6 w-6" />
        </button>
      </div>
      <div className="p-4 flex flex-col gap-3 max-h-[60vh] overflow-y-auto custom-scrollbar">
        {CALCULATORS.map((calc, index) => (
            <a 
                key={index}
                href={calc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-4 bg-[var(--background-tertiary)] hover:bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-lg transition-colors group"
            >
                <span className="font-medium text-[var(--text-primary)]">{calc.name}</span>
                <span className="text-xs font-semibold text-[var(--text-accent)] group-hover:underline">바로가기 &rarr;</span>
            </a>
        ))}
      </div>
      <div className="p-4 bg-[var(--background-tertiary)] border-t border-[var(--border-color)] flex justify-end">
        <button onClick={onClose} className="px-4 py-2 bg-[var(--background-secondary)] border border-[var(--border-color-strong)] rounded-md text-sm font-medium text-[var(--text-secondary)] hover:bg-[var(--background-primary)]">
          닫기
        </button>
      </div>
    </BaseModal>
  );
};

export default PensionCalculatorsModal;
