import React, { useState } from 'react';
import BaseModal from './ui/BaseModal';
import { XIcon, CheckIcon } from './icons';

interface UsageGuideModalProps {
  isOpen: boolean;
  onClose: (dontShowAgain: boolean) => void;
}

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="mb-6">
        <h3 className="text-xl font-bold text-[var(--text-accent)] mb-3 flex items-center gap-2">
            <div className="w-1.5 h-6 bg-[var(--background-accent)] rounded-full"></div>
            {title}
        </h3>
        <div className="space-y-3 text-sm text-[var(--text-secondary)] pl-4 leading-relaxed">
            {children}
        </div>
    </div>
);

const UsageGuideModal: React.FC<UsageGuideModalProps> = ({ isOpen, onClose }) => {
  const [dontShowAgain, setDontShowAgain] = useState(false);

  const handleClose = () => {
    onClose(dontShowAgain);
  };

  return (
    <BaseModal isOpen={isOpen} onClose={() => handleClose()} className="max-w-3xl w-full h-[90vh]">
      <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--background-secondary)] shrink-0">
        <h2 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
            🚀 JW's AI CRM 마스터 가이드
        </h2>
        <button onClick={() => handleClose()} className="text-[var(--text-muted)] hover:text-[var(--text-primary)] p-1"><XIcon className="h-6 w-6" /></button>
      </div>
      <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-[var(--background-primary)]">
        <div className="p-5 bg-[var(--background-accent-subtle)] rounded-xl mb-8 border border-[var(--border-color-strong)]/20">
            <h3 className="text-lg font-bold text-center text-[var(--text-accent)] mb-2">영업 전문가를 위한 지능형 고객 관리 파트너</h3>
            <p className="text-sm text-center text-[var(--text-secondary)]">
                JW's AI CRM은 규칙 기반 AI 기술로 영업 활동을 자동화합니다.<br/>
                흩어져 있는 정보를 한눈에 파악하고, 데이터 기반의 체계적인 영업을 시작하세요.
            </p>
        </div>
        
        <Section title="📱 설치 및 모바일 이용 팁">
            <p><strong>'홈 화면에 추가'</strong> 기능을 통해 앱처럼 설치하여 사용하세요.</p>
            <ul className="list-disc list-inside ml-2 space-y-1">
                <li><strong>안드로이드 (크롬):</strong> 우측 상단 메뉴(⋮) &gt; '앱 설치' 또는 '홈 화면에 추가'</li>
                <li><strong>iOS (사파리):</strong> 하단 공유 버튼(↑) &gt; '홈 화면에 추가'</li>
            </ul>
            <p className="text-amber-600 font-medium">⚠️ 카카오톡 내장 브라우저 이용 시 기능이 제한됩니다. 반드시 우측 하단 점 세개(...)를 눌러 <strong>'다른 브라우저로 열기'</strong>를 선택해 주세요.</p>
        </Section>

        <Section title="🏠 홈(대시보드): 스마트한 일과 관리">
            <p><strong>오늘의 브리핑:</strong> 생일(음력/윤달 지원), 상령일, 계약 만기, 재접촉 리마인더를 매일 아침 브리핑해 드립니다. 특히 '기한 지남' 항목을 통해 놓친 고객 터치를 방지하세요.</p>
            <p><strong>습관 관리:</strong> '하루 10콜', '경제지 읽기' 등 성공 루틴을 등록하세요. 월별 달성 현황과 상세 통계 기능을 통해 나의 꾸준함을 확인할 수 있습니다.</p>
            <p><strong>간편 메모:</strong> '#' 태그(예: #전략)를 활용해 메모를 분류하고 검색하세요. 중요한 메모는 색상을 지정하여 한눈에 띄게 관리할 수 있습니다.</p>
        </Section>
        
        <Section title="👥 고객 관리: 데이터 기반 타겟팅">
            <p><strong>AI 일괄 등록:</strong> 엑셀 파일 업로드는 물론, 여러 명의 정보를 텍스트로 자유롭게 나열해도 AI가 이름, 번호, 생년월일, 주소를 자동으로 분류하여 등록합니다.</p>
            <p><strong>스마트 필터 (상세 검색):</strong> "40대 남성 중 보험료 30만원 이상 가입한 고객"처럼 복잡한 조건 검색이 가능합니다. <strong>'미가입 보장'</strong> 필터를 활용해 업셀링 기회를 포착하세요.</p>
            <p><strong>관계 관리 아이콘:</strong> 이름 옆의 <strong>🔥(핫리스트), ⏰(재접촉 임박), 💧(90일 이상 방치)</strong> 아이콘이 연락 우선순위를 알려줍니다.</p>
        </Section>

        <Section title="📊 활동 및 실적: 영업 파이프라인 시각화">
            <p><strong>칸반 보드:</strong> 관심고객 → AP → PC → 계약 완료 단계를 드래그 앤 드롭으로 관리하세요. 단계 이동 시 결과 기록창이 나타나며 상담 기록이 자동 생성됩니다.</p>
            <p><strong>완료 위저드(PC/AP):</strong> 미팅 종료 후 고객 반응과 다음 전략을 정리할 수 있는 템플릿을 제공합니다. 텍스트 분석으로 실적 등록까지 한 번에 처리하세요.</p>
            <p><strong>성과 분석 리포트:</strong> 실적 추이, 연령별 분포, 취득 경로별 전환율 등을 분석합니다. <strong>'HTML 내보내기'</strong>로 깔끔한 활동 보고서를 생성할 수 있습니다.</p>
        </Section>

        <Section title="🛠️ 강력한 영업 지원 도구">
            <p><strong>4대 목표 보드:</strong> <strong>만다라트, 마인드맵, 간트 차트, 피쉬본</strong> 다이어그램을 제공합니다. 비전 설계부터 프로젝트 일정 관리까지 시각적으로 정리하세요.</p>
            <p><strong>보험사 정보 창고:</strong> 모든 보험사의 <strong>고객센터, 팩스 번호, 설계 전산 바로가기</strong> 링크가 통합되어 있어 업무 시간을 단축해 줍니다.</p>
            <p><strong>스마트 계산기:</strong> 주요 보험사별 연금 계산기 링크가 연결되어 있어 상담 현장에서 즉시 활용이 가능합니다.</p>
        </Section>

        <Section title="🔐 보안 및 데이터 관리">
            <p><strong>비밀번호 잠금:</strong> <strong>[기능 및 설정] &gt; [프로필 설정]</strong> 탭에서 비밀번호를 직접 설정할 수 있습니다. 초기 비밀번호는 따로 없으며, 설정 후에는 앱 실행 시 잠금화면이 표시됩니다.</p>
            <p><strong>철저한 개인정보 보호:</strong> 모든 데이터는 서버에 저장되지 않고 오직 <strong>사용자의 기기에만</strong> 암호화되어 저장됩니다.</p>
            <p><strong>백업 및 복원:</strong> 기기 변경 시 <strong>'데이터 내보내기'</strong>로 백업 파일을 생성하고, 새 기기에서 <strong>'가져오기'</strong>를 통해 간편하게 데이터를 옮길 수 있습니다.</p>
        </Section>

        <div className="p-4 bg-[var(--background-tertiary)] rounded-lg text-center border border-[var(--border-color-strong)]/30">
            <p className="text-sm font-semibold text-[var(--text-primary)]">💡 팁: 가이드를 다시 보고 싶다면?</p>
            <p className="text-xs text-[var(--text-muted)] mt-1">하단 메뉴 <strong>[기능]</strong> 탭 하단의 <strong>'📖 사용 가이드 보기'</strong> 버튼을 클릭하면 언제든지 다시 확인할 수 있습니다.</p>
        </div>
      </div>
      <div className="p-6 bg-[var(--background-secondary)] border-t border-[var(--border-color)] flex justify-between items-center shrink-0 rounded-b-lg">
        <label className="flex items-center cursor-pointer group">
            <div className="relative">
                <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                    className="sr-only"
                />
                <div className={`w-5 h-5 border-2 rounded transition-colors ${dontShowAgain ? 'bg-[var(--background-accent)] border-[var(--background-accent)]' : 'border-[var(--border-color-strong)] bg-transparent'}`}>
                    {dontShowAgain && <CheckIcon className="w-4 h-4 text-white" />}
                </div>
            </div>
            <span className="ml-2 text-sm font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]">다시 보지 않기</span>
        </label>
        <button onClick={() => handleClose()} className="px-8 py-2 bg-[var(--background-accent)] text-[var(--text-on-accent)] rounded-lg text-sm font-bold hover:bg-[var(--background-accent-hover)] shadow-md transition-all active:scale-95">
          가이드 닫기
        </button>
      </div>
    </BaseModal>
  );
};

export default UsageGuideModal;