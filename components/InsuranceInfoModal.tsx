
import React, { useState, useMemo } from 'react';
import BaseModal from './ui/BaseModal';
import { XIcon, SearchIcon, PhoneIcon, CheckIcon } from './icons';

interface InsuranceInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface InsuranceCompany {
    name: string;
    type: 'fire' | 'life' | 'association';
    website: string;
    customerService: string;
    incallMonitor: string;
    fax: string;
    transac: string;
    transacWebsite: string;
}

const INSURANCE_DATA: InsuranceCompany[] = [
    // ===================================================================
    // 손해보험사 (P&C / Fire Insurance)
    // ===================================================================
    { 
        name: "삼성화재", type: "fire", 
        website: "https://www.samsungfire.com/", 
        customerService: "1588-5114", 
        incallMonitor: "1566-0553",
        fax: "0505-162-0872",
        transac: "1899-5005",
        transacWebsite: "https://erp.samsungfire.com/"
    },
    { 
        name: "메리츠화재", type: "fire", 
        website: "https://www.meritzfire.com/", 
        customerService: "1566-7711", 
        incallMonitor: "1577-7711",
        fax: "0505-021-3400(3500)", 
        transac: "02-3786-2777",
        transacWebsite: "http://sales.meritzfire.com/"
    },
    { 
        name: "DB손해보험", type: "fire", 
        website: "https://www.dbins.co.kr/", 
        customerService: "1588-0100", 
        incallMonitor: "1566-0757",
        fax: "0505-181-4862",
        transac: "02-2262-1241",
        transacWebsite: "https://www.mdbins.com/chrome.html?ver=20241009"
    },
    { 
        name: "KB손해보험", type: "fire", 
        website: "https://www.kbinsure.co.kr/", 
        customerService: "1544-0114", 
        incallMonitor: "1544-0019",
        fax: "0505-136-6500",
        transac: "1544-8119",
        transacWebsite: "http://sales.kbinsure.co.kr/"
    },
    { 
        name: "현대해상", type: "fire", 
        website: "https://www.hi.co.kr/", 
        customerService: "1588-5656", 
        incallMonitor: "1577-3223",
        fax: "0507-774-6060", 
        transac: "02-2628-4567",
        transacWebsite: "https://sp.hi.co.kr/"
    },
    { 
        name: "한화손해보험", type: "fire", 
        website: "https://www.hanwha-sli.com/", 
        customerService: "1566-8000", 
        incallMonitor: "1670-1882",
        fax: "0502-779-1004", 
        transac: "02-316-0111",
        transacWebsite: "http://portal.hwgeneralins.com/"
    },
    { 
        name: "롯데손해보험", type: "fire", 
        website: "https://www.lotteins.co.kr/", 
        customerService: "1588-3344", 
        incallMonitor: "1600-5182",
        fax: "0507-333-9999", 
        transac: "02-3455-3984",
        transacWebsite: "http://lottero.lotteins.co.kr/"
    },
    { 
        name: "흥국화재", type: "fire", 
        website: "https://www.heungkukfire.co.kr/", 
        customerService: "1688-1688", 
        incallMonitor: "1688-6997",
        fax: "0504-800-0700", 
        transac: "031-786-8088",
        transacWebsite: "https://sales.heungkukfire.co.kr/"
    },
    { 
        name: "하나손해보험", type: "fire", 
        website: "https://www.hanainsu.co.kr/", 
        customerService: "1566-3000", 
        incallMonitor: "02-6299-6821",
        fax: "0505-170-0765", 
        transac: "02-6670-8110",
        transacWebsite: "https://sfa.saleshana.com/index.html"
    },
    { 
        name: "농협손해보험", type: "fire", 
        website: "https://www.nhfire.co.kr/", 
        customerService: "1644-9000", 
        incallMonitor: "1644-9600",
        fax: "0505-060-7000", 
        transac: "1644-0090",
        transacWebsite: "https://ss.nhfire.co.kr/"
    },
    { 
        name: "라이나손보", type: "fire", 
        website: "https://www.cignakor.co.kr/", 
        customerService: "1566-5800", 
        incallMonitor: "1833-9513",
        fax: "02-6913-8482", 
        transac: "02-2127-2308",
        transacWebsite: "https://hub-kr.apac.chubb.com/"
    },
    { 
        name: "AIG손해보험", type: "fire", 
        website: "https://www.aig.co.kr/", 
        customerService: "1544-2792", 
        incallMonitor: "1544-2792",
        fax: "02-2011-4607", 
        transac: "02-2260-6855",
        transacWebsite: "https://sso.aig.co.kr/gaLogin/gaLogin.jsp"
    },
    { 
        name: "MG손해보험", type: "fire", 
        website: "https://www.mgsontor.co.kr/", 
        customerService: "1588-5959", 
        incallMonitor: "1577-3777",
        fax: "0505-088-1646", 
        transac: "02-3788-2261",
        transacWebsite: "https://mganet.mggeneralins.com/"
    },

    // ===================================================================
    // 생명보험사 (Life Insurance)
    // ===================================================================
    { 
        name: "삼성생명", type: "life", 
        website: "https://www.samsunglife.com/", 
        customerService: "1588-3114", 
        incallMonitor: "1588-3115",
        fax: "고객센터에 전화", 
        transac: "02-311-4500",
        transacWebsite: "https://connectplus.samsunglife.com:10443/gasso/login"
    },
    { 
        name: "교보생명", type: "life", 
        website: "https://www.kyobolife.co.kr/", 
        customerService: "1588-1001", 
        incallMonitor: "1588-1636",
        fax: "고객센터에 전화", 
        transac: "02-721-3130",
        transacWebsite: "https://ga.kyobo.com/"
    },
    { 
        name: "한화생명", type: "life", 
        website: "https://www.hanwhalife.com/", 
        customerService: "1588-6363", 
        incallMonitor: "1800-6633",
        fax: "고객센터에 전화",
        transac: "02-1522-6379",
        transacWebsite: "https://hmp.hanwhalife.com/online/ga"
    },
    { 
        name: "동양생명", type: "life", 
        website: "https://www.myangel.co.kr/", 
        customerService: "1577-1004", 
        incallMonitor: "080-899-1004",
        fax: "02-3289-4517", 
        transac: "02-728-9900",
        transacWebsite: "http://1004.myangel.co.kr/"
    },
    { 
        name: "KDB생명", type: "life", 
        website: "https://www.kdblife.co.kr/", 
        customerService: "1588-4040", 
        incallMonitor: "1588-4040",
        fax: "접수 후 02-2669-7930", 
        transac: "02-6303-2771",
        transacWebsite: "http://kss.kdblife.co.kr/"
    },
    { 
        name: "IM라이프", type: "life", 
        website: "https://www.imlife.co.kr/", 
        customerService: "1588-4770", 
        incallMonitor: "1588-4770",
        fax: "0505-083-5420", 
        transac: "02-2087-9594",
        transacWebsite: "https://fgs.dgbfnlife.com:8443/"
    },
    { 
        name: "미래에셋생명", type: "life", 
        website: "https://life.miraeasset.com/", 
        customerService: "1588-0220", 
        incallMonitor: "1588-0220",
        fax: "고객센터에 전화", 
        transac: "02-3271-5108",
        transacWebsite: "http://www.loveageplan.com/"
    },
    { 
        name: "신한라이프", type: "life", 
        website: "https://www.shinhanlife.co.kr/", 
        customerService: "1588-5580", 
        incallMonitor: "1522-2285",
        fax: "고객센터에 전화",
        transac: "02-3455-4119",
        transacWebsite: "https://ga.shinhanlife.co.kr/"
    },
    { 
        name: "KB라이프", type: "life", 
        website: "https://www.kblife.co.kr/", 
        customerService: "1588-3374", 
        incallMonitor: "1566-2730",
        fax: "02-6220-9912", 
        transac: "1899-3899",
        transacWebsite: "http://sfa.kblife.co.kr/"
    },
    { 
        name: "DB생명", type: "life", 
        website: "https://www.idblife.com/", 
        customerService: "1588-3131", 
        incallMonitor: "02-6470-7663",
        fax: "0505-129-3134",
        transac: "02-2119-5151",
        transacWebsite: "http://etopia.dongbulife.com/"
    },
    { 
        name: "하나생명", type: "life", 
        website: "https://www.hanalife.co.kr/", 
        customerService: "1577-1112", 
        incallMonitor: "1577-1112",
        fax: "고객센터에 전화", 
        transac: "02-3709-8602",
        transacWebsite: "https://ga.hanalife.co.kr/"
    },
    { 
        name: "흥국생명", type: "life", 
        website: "https://www.heungkuklife.co.kr/", 
        customerService: "1588-2288", 
        incallMonitor: "1877-7006",
        fax: "고객센터에 전화",
        transac: "031-786-8088",
        transacWebsite: "https://e-life.heungkuklife.co.kr/"
    },
    { 
        name: "ABL생명", type: "life", 
        website: "https://www.abllife.co.kr/", 
        customerService: "1588-6500", 
        incallMonitor: "1566-1002",
        fax: "02-3299-5544", 
        transac: "02-3787-8583",
        transacWebsite: "http://ga.abllife.co.kr/"
    },
    { 
        name: "IBK연금보험", type: "life", 
        website: "https://www.ibkpension.co.kr/", 
        customerService: "1577-4117", 
        incallMonitor: "02-2270-1661",
        fax: "02-2270-1577", 
        transac: "02-2270-1692",
        transacWebsite: "https://sf.ibki.co.kr/"
    },
    { 
        name: "농협생명", type: "life", 
        website: "https://www.nhlife.co.kr/", 
        customerService: "1544-4000", 
        incallMonitor: "1544-4422",
        fax: "02-6971-6040", 
        transac: "02-3786-8800",
        transacWebsite: "http://www.nhlife.co.kr/nhsmart.nhl"
    },
    { 
        name: "메트라이프", type: "life", 
        website: "https://www.metlife.co.kr/", 
        customerService: "1588-9600", 
        incallMonitor: "1588-9600",
        fax: "고객센터에 전화", 
        transac: "1899-0751",
        transacWebsite: "https://metplus.metlife.co.kr/WebCudeSetup.jsp"
    },
    { 
        name: "처브라이프", type: "life", 
        website: "https://www.chubblife.co.kr/", 
        customerService: "1599-4600", 
        incallMonitor: "1599-4600",
        fax: "02-3480-7801", 
        transac: "1599-4646",
        transacWebsite: "http://esmart.chubblife.co.kr/"
    },
    { 
        name: "푸본현대생명", type: "life", 
        website: "https://www.fubonhyundai.com/", 
        customerService: "1577-3311", 
        incallMonitor: "-",
        fax: "0505-106-0311", 
        transac: "080-860-1212",
        transacWebsite: "https://ez.fubonhyundai.com/"
    },
    { 
        name: "BNP카디프생명", type: "life", 
        website: "https://www.cardif.co.kr/", 
        customerService: "1688-1118", 
        incallMonitor: "1688-1118",
        fax: "고객센터에 전화", 
        transac: "1577-3435",
        transacWebsite: "http://ga.cardif.co.kr/"
    },
    { 
        name: "AIA생명", type: "life", 
        website: "https://www.aia.co.kr/", 
        customerService: "1588-9898", 
        incallMonitor: "1588-2513",
        fax: "02-2021-4540", 
        transac: "1588-2937",
        transacWebsite: "https://imap.aia.co.kr/"
    },
    { 
        name: "라이나생명", type: "life", 
        website: "https://www.lina.co.kr/", 
        customerService: "1588-0058", 
        incallMonitor: "1588-2442",
        fax: "02-6944-1200", 
        transac: "02-3781-2006",
        transacWebsite: "https://ga.lina.co.kr/"
    },

    // ===================================================================
    // 공제/우체국 (Associations)
    // ===================================================================
    {
        name: "우체국보험", type: "association",
        website: "https://www.epostbank.go.kr/home/cnts/epostInsu.do",
        customerService: "1599-9010",
        incallMonitor: "-",
        fax: "0505-005-지역별번호", 
        transac: "-",
        transacWebsite: "https://epostlife.go.kr/LNLNDM10DM.do"
    },
    {
        name: "신협 공제조합", type: "association",
        website: "https://life.cu.co.kr/",
        customerService: "1577-3993",
        incallMonitor: "-",
        fax: "02-3278-9696",
        transac: "-", 
        transacWebsite: "https://openbank.cu.co.kr/?sub=6000"
    },
    {
        name: "MG새마을금고 공제조합", type: "association",
        website: "https://www.kfcc.co.kr/",
        customerService: "1544-3030",
        incallMonitor: "-",
        fax: "고객센터에 전화",
        transac: "-",
        transacWebsite: "https://insu.kfcc.co.kr/main.do"
    },
    {
        name: "농협 공제", type: "association",
        website: "https://www.nhlife.co.kr/",
        customerService: "1599-0100",
        incallMonitor: "-",
        fax: "지역별 문의",
        transac: "-",
        transacWebsite: "https://www.nhlife.co.kr/"
    },
    {
        name: "수협 공제조합", type: "association",
        website: "https://www.suhyup-bank.com/",
        customerService: "1588-4119",
        incallMonitor: "-",
        fax: "고객센터에 전화",
        transac: "-",
        transacWebsite: "https://www.suhyup-bank.com/"
    },
    {
        name: "The K 공제조합", type: "association",
        website: "https://www.ktcu.or.kr/",
        customerService: "1544-4110", 
        incallMonitor: "-",
        fax: "02-767-8000",
        transac: "-",
        transacWebsite: "https://www.ktcu.or.kr/MH/MH-P010M01.do"
    },
];

const InsuranceInfoModal: React.FC<InsuranceInfoModalProps> = ({ isOpen, onClose }) => {
    const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'fire' | 'life' | 'association'>('all');

    const filteredData = useMemo(() => {
        const lowerTerm = searchTerm.toLowerCase();
        return INSURANCE_DATA.filter(item => {
            const matchesSearch = item.name.toLowerCase().includes(lowerTerm);
            const matchesType = filterType === 'all' || item.type === filterType;
            return matchesSearch && matchesType;
        });
    }, [searchTerm, filterType]);

    if (!isOpen) return null;

    const getItemTypeName = (type: string) => {
        switch(type) {
            case 'fire': return '손해보험사';
            case 'life': return '생명보험사';
            case 'association': return '공제/우체국';
            default: return '기타';
        }
    };

    const getItemTypeClass = (type: string) => {
        switch(type) {
            case 'fire': return 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100';
            case 'life': return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100';
            case 'association': return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-100';
            default: return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-100';
        }
    };

    return (
        <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-6xl w-full h-[90vh]">
            <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--background-secondary)]">
                <h2 className="text-2xl font-bold text-[var(--text-primary)]">보험사 주요 연락처 및 공식 링크</h2>
                <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
                    <XIcon className="h-6 w-6" />
                </button>
            </div>

            <div className="p-6 flex flex-col h-full bg-[var(--background-primary)] overflow-hidden">
                 {/* Filters */}
                <div className="flex flex-col md:flex-row gap-4 mb-6 shrink-0">
                    <div className="flex bg-[var(--background-tertiary)] p-1 rounded-lg shrink-0">
                        <button 
                            onClick={() => setViewMode('card')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${viewMode === 'card' ? 'bg-[var(--background-secondary)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                        >
                            카드 보기
                        </button>
                        <button 
                            onClick={() => setViewMode('table')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${viewMode === 'table' ? 'bg-[var(--background-secondary)] text-[var(--text-primary)] shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
                        >
                            표 보기
                        </button>
                    </div>
                    
                    <div className="flex-1 relative">
                         <input 
                            type="text" 
                            placeholder="보험사 이름 검색..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--background-accent)]"
                        />
                        <SearchIcon className="absolute left-3 top-2.5 h-5 w-5 text-[var(--text-muted)]" />
                    </div>

                    <select 
                        value={filterType}
                        onChange={(e) => setFilterType(e.target.value as any)}
                        className="p-2 bg-[var(--background-tertiary)] border border-[var(--border-color-strong)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--background-accent)]"
                    >
                        <option value="all">전체 보험사</option>
                        <option value="fire">손해보험사</option>
                        <option value="life">생명보험사</option>
                        <option value="association">공제/우체국</option>
                    </select>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    {filteredData.length === 0 ? (
                        <div className="flex items-center justify-center h-64 text-[var(--text-muted)]">
                            검색 결과가 없습니다.
                        </div>
                    ) : viewMode === 'card' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-6">
                            {filteredData.map((item, index) => (
                                <div key={index} className="bg-[var(--background-secondary)] border border-[var(--border-color)] rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-xl font-bold text-[var(--text-primary)]">{item.name}</h3>
                                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getItemTypeClass(item.type)}`}>
                                            {getItemTypeName(item.type)}
                                        </span>
                                    </div>
                                    
                                    <a 
                                        href={item.transacWebsite} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="block w-full py-3 mb-4 text-center bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold transition-colors"
                                    >
                                        설계 전산 바로가기
                                    </a>

                                    <div className="space-y-2 text-sm text-[var(--text-secondary)]">
                                        <div className="flex justify-between">
                                            <span className="text-[var(--text-muted)]">📞 고객센터</span>
                                            <span className="font-medium hover:text-[var(--text-accent)] cursor-pointer" onClick={() => window.location.href=`tel:${item.customerService.replace(/-/g, '')}`}>{item.customerService}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[var(--text-muted)]">☎️ 인콜 모니터링</span>
                                            <span className="font-medium">{item.incallMonitor}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[var(--text-muted)]">📠 청구 팩스</span>
                                            <span className="font-medium text-right max-w-[60%]">{item.fax}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-[var(--text-muted)]">💻 전산 헬프데스크</span>
                                            <span className="font-medium">{item.transac}</span>
                                        </div>
                                    </div>

                                    <div className="mt-4 pt-4 border-t border-[var(--border-color)]">
                                        <a href={item.website} target="_blank" rel="noopener noreferrer" className="block text-center text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] bg-[var(--background-tertiary)] py-2 rounded-lg hover:bg-[var(--border-color)] transition-colors">
                                            공식 홈페이지 (고객용)
                                        </a>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-lg border border-[var(--border-color)]">
                             <table className="min-w-full divide-y divide-[var(--border-color)]">
                                <thead className="bg-[var(--background-tertiary)]">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">보험사명</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">유형</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">고객센터</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">인콜 모니터링</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">전산 헬프데스크</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">청구 팩스</th>
                                        <th className="px-4 py-3 text-left text-xs font-medium text-[var(--text-muted)] uppercase tracking-wider">바로가기</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-[var(--background-secondary)] divide-y divide-[var(--border-color)]">
                                    {filteredData.map((item, index) => (
                                        <tr key={index} className="hover:bg-[var(--background-tertiary)] transition-colors">
                                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-[var(--text-primary)]">{item.name}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm">
                                                 <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getItemTypeClass(item.type)}`}>
                                                    {getItemTypeName(item.type)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--text-secondary)]">
                                                <a href={`tel:${item.customerService.replace(/-/g, '')}`} className="hover:underline">{item.customerService}</a>
                                            </td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--text-secondary)]">{item.incallMonitor}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm text-[var(--text-secondary)]">{item.transac}</td>
                                            <td className="px-4 py-3 text-sm text-[var(--text-secondary)] max-w-xs truncate" title={item.fax}>{item.fax}</td>
                                            <td className="px-4 py-3 whitespace-nowrap text-sm space-y-1">
                                                <a href={item.transacWebsite} target="_blank" rel="noopener noreferrer" className="block text-emerald-600 hover:text-emerald-500 font-semibold">전산</a>
                                                <a href={item.website} target="_blank" rel="noopener noreferrer" className="block text-blue-500 hover:text-blue-400">홈페이지</a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
            <div className="p-4 bg-[var(--background-tertiary)] border-t border-[var(--border-color)] text-center text-xs text-[var(--text-muted)] rounded-b-lg">
                데이터는 사용자 제공 정보 및 공시된 자료를 참고하여 작성되었습니다. 설계 전산은 PC 전용일 수 있습니다.
            </div>
        </BaseModal>
    );
};

export default InsuranceInfoModal;
