import React, { useState } from 'react';
import { ChevronDownIcon } from './icons';

interface InsuranceInfo {
  jinwonId?: string;
  jinwonPw?: string;
  company: {
    name: string;
    details?: string[];
  };
  customerCenter: string;
  claimFax: string;
  inCallMonitoring: string;
  helpDesk: string;
  terms: {
    name: string;
    link?: string;
  };
  claimForm: {
    name: string;
    link?: string;
    details?: string;
  }[];
}

const nonLifeInsuranceData: InsuranceInfo[] = [
  { jinwonId: '2331088', jinwonPw: '501!', company: { name: '삼성화재', details: ['인카'] }, customerCenter: '1588-5114', claimFax: '0505-162-0872', inCallMonitoring: '1566-0553', helpDesk: '1899-5005', terms: { name: '삼성화재' }, claimForm: [{ name: '청구서' }] },
  { jinwonId: '87352560', jinwonPw: '505!', company: { name: '메리츠화재', details: ['크롬, 안드로이드'] }, customerCenter: '1566-7711', claimFax: '0505-021-3400(3500)', inCallMonitoring: '1577-7711', helpDesk: '02-3786-2777', terms: { name: '메리츠' }, claimForm: [{ name: '청구서' }] },
  { jinwonId: '44432478', jinwonPw: '15', company: { name: 'DB손해보험' }, customerCenter: '1588-0100', claimFax: '0505-181-4862', inCallMonitoring: '1566-0757', helpDesk: '02-2262-1241', terms: { name: 'DB손보' }, claimForm: [{ name: '청구서' }] },
  { jinwonId: 'r4342787', jinwonPw: '507!', company: { name: 'KB손해보험' }, customerCenter: '1544-0114', claimFax: '0505-136-6500', inCallMonitoring: '1544-0019', helpDesk: '1544-8119', terms: { name: 'KB손보' }, claimForm: [{ name: '청구서' }] },
  { jinwonId: '4ND748', jinwonPw: '508!', company: { name: '현대해상' }, customerCenter: '1588-5656', claimFax: '0507-774-6060', inCallMonitoring: '1577-3223', helpDesk: '02-2628-4567', terms: { name: '현대해상' }, claimForm: [{ name: '청구서' }] },
  { jinwonId: '5025826', jinwonPw: '505!', company: { name: '한화손해보험' }, customerCenter: '1566-8000', claimFax: '0502-779-1004', inCallMonitoring: '1670-1882', helpDesk: '02-316-0111', terms: { name: '한화손보' }, claimForm: [{ name: '청구서' }] },
  { jinwonId: '5C61078', jinwonPw: '505!', company: { name: '롯데손해보험' }, customerCenter: '1588-3344', claimFax: '0507-333-9999', inCallMonitoring: '1600-5182', helpDesk: '02-3455-3984', terms: { name: '롯데손보' }, claimForm: [{ name: '청구서' }] },
  { jinwonId: '68966636', jinwonPw: '401!', company: { name: '흥국화재' }, customerCenter: '1688-1688', claimFax: '0504-800-0700', inCallMonitoring: '1688-6997', helpDesk: '031-786-8088', terms: { name: '흥국화재' }, claimForm: [{ name: '청구서' }] },
  { jinwonId: '', jinwonPw: '66!', company: { name: '하나손해보험' }, customerCenter: '1566-3000', claimFax: '0505-170-0765', inCallMonitoring: '02-6299-6821', helpDesk: '02-6670-8110', terms: { name: '하나손보' }, claimForm: [{ name: '청구서' }] },
  { jinwonId: 'F0612408', jinwonPw: '508!', company: { name: '농협손해보험' }, customerCenter: '1644-9000', claimFax: '0505-060-7000', inCallMonitoring: '1644-9600', helpDesk: '1644-0090', terms: { name: '농손' }, claimForm: [{ name: '청구서' }] },
  { company: { name: '라이나손보' }, customerCenter: '1566-5800', claimFax: '', inCallMonitoring: '1833-9513', helpDesk: '27-2308 (치아 02-6913-)', terms: { name: '라이나손보' }, claimForm: [{ name: '청구서' }] },
  { company: { name: 'AIG손해보험' }, customerCenter: '1544-2792', claimFax: '02-2011-4607', inCallMonitoring: '1544-2792', helpDesk: '02-2260-6855', terms: { name: 'AIG손보' }, claimForm: [{ name: '청구서' }] },
  { jinwonId: '6F61144', jinwonPw: '11!', company: { name: 'MG손해보험' }, customerCenter: '1588-5959', claimFax: '0505-088-1646', inCallMonitoring: '1577-3777', helpDesk: '02-3788-2261', terms: { name: 'MG손보' }, claimForm: [{ name: '청구서' }] },
];

const lifeInsuranceData: InsuranceInfo[] = [
    { jinwonId: '22311408', jinwonPw: '505!', company: { name: '한화생명' }, customerCenter: '1588-6363', claimFax: '고객센터에 전화', inCallMonitoring: '1800-6633', helpDesk: '02-1522-6379', terms: { name: '한화생명' }, claimForm: [{ name: '청구서' }] },
    { jinwonId: '1619196', jinwonPw: '다505!', company: { name: '동양생명' }, customerCenter: '1577-1004', claimFax: '02-3289-4517', inCallMonitoring: '080-899-1004', helpDesk: '02-728-9900', terms: { name: '동양생명' }, claimForm: [{ name: '청구서' }] },
    { jinwonId: '02357969', jinwonPw: '11!', company: { name: '교보생명' }, customerCenter: '1588-1001', claimFax: '고객센터에 전화', inCallMonitoring: '1588-1636', helpDesk: '02-721-3130', terms: { name: '교보생명' }, claimForm: [{ name: '청구서' }] },
    { jinwonId: '0001937176', jinwonPw: '501!', company: { name: '삼성생명' }, customerCenter: '1588-3114', claimFax: '고객센터에 전화', inCallMonitoring: '1588-3115', helpDesk: '02-311-4500', terms: { name: '삼성생명' }, claimForm: [{ name: '청구서' }] },
    { company: { name: '라이나생명', details: ['크롬, 갤럭시폰'] }, customerCenter: '1588-0058', claimFax: '02-6944-1200', inCallMonitoring: '1588-2442', helpDesk: '02-3781-2006', terms: { name: '라이나생명' }, claimForm: [{ name: '치아 청구', link: 'http://www.ina.co.kr' }, {name: '질병보험금청구서류'}] },
    { jinwonId: '1419498', jinwonPw: '509!', company: { name: 'KDB생명', details: ['크롬, 갤럭시폰'] }, customerCenter: '1588-4040', claimFax: '접수 후 02-2669-7930', inCallMonitoring: '1588-4040', helpDesk: '02-6303-2771', terms: { name: 'KDB생명' }, claimForm: [{ name: '청구서' }] },
    { jinwonId: 'AA217287', jinwonPw: '507!', company: { name: 'IM라이프', details: ['크롬, 갤럭시폰'] }, customerCenter: '1588-4770', claimFax: '0505-083-5420', inCallMonitoring: '1588-4770', helpDesk: '02-2087-9594', terms: { name: 'IM라이프' }, claimForm: [{ name: '청구서' }] },
    { jinwonId: '14814603', jinwonPw: '505!/1215', company: { name: '미래에셋생명', details: ['크롬, 아이패드'] }, customerCenter: '1588-0220', claimFax: '고객센터에 전화', inCallMonitoring: '1588-0220', helpDesk: '02-3271-5108', terms: { name: '미래에셋' }, claimForm: [{ name: '청구서' }] },
    { jinwonId: '32030039', jinwonPw: '508!', company: { name: '신한라이프', details: ['크롬'] }, customerCenter: '1588-5580', claimFax: '고객센터에 전화', inCallMonitoring: '1522-2285', helpDesk: '02-3455-4119', terms: { name: '신한' }, claimForm: [{ name: '청구서' }] },
    { jinwonId: '1347227', jinwonPw: '506!', company: { name: 'KB라이프', details: ['크롬, 아이패드'] }, customerCenter: '1588-3374', claimFax: '02-6220-9912', inCallMonitoring: '1566-2730', helpDesk: '1899-3899', terms: { name: 'KB라이프' }, claimForm: [{ name: '청구서' }] },
    { jinwonId: '981059', jinwonPw: '11!', company: { name: 'DB생명' }, customerCenter: '1588-3131', claimFax: '0505-129-3134', inCallMonitoring: '02-6470-7663', helpDesk: '02-2119-5151', terms: { name: 'DB생명' }, claimForm: [{ name: '청구서' }] },
    { jinwonId: 'G7120182', jinwonPw: '11!/다410!', company: { name: '하나생명' }, customerCenter: '1577-1112', claimFax: '고객센터에 전화', inCallMonitoring: '1577-1112', helpDesk: '02-3709-8602~3', terms: { name: '하나생명' }, claimForm: [{ name: '청구서' }] },
    { jinwonId: '1006491773', jinwonPw: '401!', company: { name: '흥국생명' }, customerCenter: '1588-2288', claimFax: '고객센터에 전화', inCallMonitoring: '1877-7006', helpDesk: '031-786-8088', terms: { name: '흥국생명' }, claimForm: [{ name: '청구서' }] },
    { company: { name: 'ABL생명' }, customerCenter: '1588-6500', claimFax: '02-3299-5544', inCallMonitoring: '1566-1002', helpDesk: '02-3787-8583', terms: { name: 'ABL생명' }, claimForm: [{ name: '청구서' }] },
    { jinwonId: 'G93929', jinwonPw: '505!', company: { name: 'IBK연금보험' }, customerCenter: '1577-4117', claimFax: '02-2270-1577', inCallMonitoring: '02-2270-1661', helpDesk: '02-2270-1692', terms: { name: 'IBK연금' }, claimForm: [{ name: '청구서' }] },
    { jinwonId: 'D0984075', jinwonPw: '408!', company: { name: '농협생명' }, customerCenter: '1544-4000', claimFax: '02-6971-6040', inCallMonitoring: '1544-4422', helpDesk: '02-3786-8800', terms: { name: '농협생명' }, claimForm: [{ name: '청구서' }] },
    { jinwonId: '00401005', jinwonPw: 'E2508', company: { name: '메트라이프' }, customerCenter: '1588-9600', claimFax: '고객센터에 전화', inCallMonitoring: '1588-9600', helpDesk: '1899-0751', terms: { name: '메트라이프' }, claimForm: [{ name: '청구서' }] },
    { company: { name: '처브라이프' }, customerCenter: '1599-4600', claimFax: '02-3480-7801', inCallMonitoring: '1599-4600', helpDesk: '1599-4646', terms: { name: '처브라이프' }, claimForm: [{ name: '청구서' }] },
    { jinwonId: '99415816', jinwonPw: '11!', company: { name: '푸본현대생명' }, customerCenter: '1577-3311', claimFax: '0505-106-0311', inCallMonitoring: '', helpDesk: '080-860-1212', terms: { name: '푸본현대' }, claimForm: [{ name: '청구서' }] },
    { company: { name: 'BNP카디프생명' }, customerCenter: '1688-1118', claimFax: '고객센터에 전화', inCallMonitoring: '1688-1118', helpDesk: '1577-3435', terms: { name: 'BNP카디프' }, claimForm: [{ name: '청구서' }] },
    { company: { name: 'AIA생명' }, customerCenter: '1588-9898', claimFax: '02-2021-4540', inCallMonitoring: '1588-2513', helpDesk: '1588-2937', terms: { name: 'AIA생명' }, claimForm: [{ name: '청구서' }] },
];

const coopData: InsuranceInfo[] = [
  { company: { name: 'MG새마을금고' }, customerCenter: '1599-9010', claimFax: '02-3016-7674', inCallMonitoring: '', helpDesk: '', terms: { name: 'MG' }, claimForm: [{ name: '청구서' }] },
  { company: { name: 'The K' }, customerCenter: '1577-3993', claimFax: '02-3278-9696', inCallMonitoring: '', helpDesk: '', terms: { name: 'The K' }, claimForm: [{ name: '청구서' }] },
  { 
    company: { name: '우체국보험' }, 
    customerCenter: '1599-0100', 
    claimFax: `팩스: 0505-005-지역별번호\n1224(서울) 1427(경인동부) 1428(경인서부) 2271(강원)\n1788(충청) 2163(전북) 1921(전남) 1623(부산) 2070(경북)\n7116(서귀포) 2296(제주)`,
    inCallMonitoring: '', 
    helpDesk: '', 
    terms: { name: '우체국보험' }, 
    claimForm: [{ name: '청구서' }] 
  },
  { company: { name: '수협' }, customerCenter: '1588-4119', claimFax: '고객센터에 전화', inCallMonitoring: '', helpDesk: '', terms: { name: '수협' }, claimForm: [{ name: '청구서' }] },
  { company: { name: '신협' }, customerCenter: '1544-3030', claimFax: '고객센터에 전화', inCallMonitoring: '', helpDesk: '', terms: { name: '신협' }, claimForm: [{ name: '청구서' }] },
];

const InsuranceTable: React.FC<{ data: InsuranceInfo[] }> = ({ data }) => (
    <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-[var(--border-color)]">
            <thead className="bg-[var(--background-tertiary)]">
                <tr>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">보험회사</th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">진원 사번/비번</th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">고객센터</th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">보험금 청구팩스</th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">인콜 모니터링</th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">전산 헬프데스크</th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">약관확인</th>
                    <th scope="col" className="px-3 py-3 text-left text-xs font-medium text-[var(--text-secondary)] uppercase tracking-wider">청구서</th>
                </tr>
            </thead>
            <tbody className="bg-[var(--background-secondary)] divide-y divide-[var(--border-color)]">
                {data.map((item, index) => (
                    <tr key={index}>
                        <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-[var(--text-primary)]">
                            {item.company.name}
                            {item.company.details && item.company.details.map((d, i) => <div key={i} className="text-xs text-[var(--text-muted)]">{d}</div>)}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-[var(--text-muted)]">{item.jinwonId || ''}{item.jinwonPw ? ` / ${item.jinwonPw}` : ''}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-[var(--text-muted)]">
                            <a href={`tel:${item.customerCenter.replace(/-/g, '')}`} className="text-[var(--text-accent)] hover:underline">{item.customerCenter}</a>
                        </td>
                        <td className="px-3 py-4 whitespace-pre-wrap text-sm text-[var(--text-muted)]">{item.claimFax}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-[var(--text-muted)]">{item.inCallMonitoring}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-[var(--text-muted)]">{item.helpDesk}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-[var(--text-muted)]">{item.terms.name}</td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-[var(--text-muted)]">
                            {item.claimForm.map((form, i) => (
                                <div key={i}>
                                    <a href={form.link || '#'} target={form.link ? '_blank' : '_self'} rel="noopener noreferrer" className="text-[var(--text-accent)] hover:underline" onClick={(e) => !form.link && e.preventDefault()}>
                                        {form.name}
                                    </a>
                                </div>
                            ))}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);

const Section: React.FC<{ title: string; sectionId: string; openSection: string; setOpenSection: (id: string) => void; children: React.ReactNode }> = ({ title, sectionId, openSection, setOpenSection, children }) => {
    const isOpen = openSection === sectionId;
    return (
        <div className="border border-[var(--border-color)] rounded-lg mb-4 bg-[var(--background-secondary)]">
            <button
                className="w-full flex justify-between items-center p-4 hover:bg-[var(--background-tertiary)] focus:outline-none"
                onClick={() => setOpenSection(isOpen ? '' : sectionId)}
                aria-expanded={isOpen}
            >
                <h2 className="text-xl font-bold text-[var(--text-primary)]">{title}</h2>
                <ChevronDownIcon className={`h-6 w-6 text-[var(--text-muted)] transition-transform ${isOpen ? 'transform rotate-180' : ''}`} />
            </button>
            {isOpen && (
                <div className="p-4 bg-[var(--background-primary)] animate-fade-in">
                    {children}
                </div>
            )}
        </div>
    );
};


const InsuranceInfoPage = () => {
    const [openSection, setOpenSection] = useState('non-life');

    return (
        <div>
            <div className="mb-6">
                <h1 className="text-3xl font-bold text-[var(--text-primary)]">보험사 정보</h1>
            </div>

            <Section title="손해보험사" sectionId="non-life" openSection={openSection} setOpenSection={setOpenSection}>
                <InsuranceTable data={nonLifeInsuranceData} />
            </Section>

            <Section title="생명보험사" sectionId="life" openSection={openSection} setOpenSection={setOpenSection}>
                <InsuranceTable data={lifeInsuranceData} />
            </Section>

            <Section title="공제조합" sectionId="coop" openSection={openSection} setOpenSection={setOpenSection}>
                <InsuranceTable data={coopData} />
            </Section>
        </div>
    );
};

export default InsuranceInfoPage;