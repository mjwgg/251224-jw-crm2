import React from 'react';
import type { Customer, Appointment, Consultation, DailyReview, Todo, QuickMemo, Contract } from '../types';
import { XIcon, UsersIcon, CalendarIcon, DocumentTextIcon, CheckIcon, PencilIcon, BriefcaseIcon } from './icons';
import Spinner from './ui/Spinner';
import BaseModal from './ui/BaseModal';

interface SearchResults {
  customers: { customer: Customer; snippet: string }[];
  appointments: { appointment: Appointment; snippet: string }[];
  consultations: { customer: Customer; consultation: Consultation; snippet: string }[];
  dailyReviews: { review: DailyReview; snippet: string }[];
  todos: { todo: Todo; snippet: string }[];
  quickMemos: { memo: QuickMemo; snippet: string }[];
  contracts: { customer: Customer; contract: Contract; snippet: string }[];
}

interface SearchResultsModalProps {
  isOpen: boolean;
  onClose: () => void;
  results: SearchResults | null;
  isLoading: boolean;
  onSelectCustomer: (customer: Customer, initialTab?: 'details' | 'consultations' | 'contracts' | 'callHistory') => void;
  onSelectAppointment: (appointment: Appointment) => void;
  onSelectConsultation: (customer: Customer, consultation: Consultation) => void;
  onSelectTodo: (todo: Todo) => void;
  onSelectQuickMemo: (memo: QuickMemo) => void;
  onSelectContract: (customer: Customer, contract: Contract) => void;
  onSelectDailyReview: () => void;
}

const SearchResultsModal: React.FC<SearchResultsModalProps> = ({
  isOpen,
  onClose,
  results,
  isLoading,
  onSelectCustomer,
  onSelectAppointment,
  onSelectConsultation,
  onSelectTodo,
  onSelectQuickMemo,
  onSelectContract,
  onSelectDailyReview,
}) => {
  const hasResults = results && (results.customers.length > 0 || results.appointments.length > 0 || results.consultations.length > 0 || results.dailyReviews.length > 0 || results.todos.length > 0 || results.quickMemos.length > 0 || results.contracts.length > 0);

  const handleSelectCustomer = (customer: Customer) => {
    onClose();
    onSelectCustomer(customer);
  };

  const handleSelectAppointment = (appointment: Appointment) => {
    onClose();
    onSelectAppointment(appointment);
  };
  
  const handleSelectConsultation = (customer: Customer, consultation: Consultation) => {
    onClose();
    onSelectConsultation(customer, consultation);
  };

  const handleSelectTodo = (todo: Todo) => {
    onClose();
    onSelectTodo(todo);
  };

  const handleSelectQuickMemo = (memo: QuickMemo) => {
    onClose();
    onSelectQuickMemo(memo);
  };

  const handleSelectContract = (customer: Customer, contract: Contract) => {
    onClose();
    onSelectContract(customer, contract);
  };
  
  const handleSelectDailyReview = () => {
    onClose();
    onSelectDailyReview();
  };


  return (
    <BaseModal isOpen={isOpen} onClose={onClose} className="max-w-4xl w-full">
        <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center flex-shrink-0">
          <h2 className="text-2xl font-bold text-[var(--text-primary)]">통합 검색 결과</h2>
          <button onClick={onClose} className="text-[var(--text-muted)] hover:text-[var(--text-primary)]">
            <XIcon className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1 min-h-0">
          {isLoading ? (
            <div className="text-center py-10 flex flex-col items-center justify-center h-full">
              <Spinner />
              <p className="text-[var(--text-muted)] mt-4">데이터를 검색하고 있습니다...</p>
            </div>
          ) : !hasResults ? (
            <div className="text-center py-10 h-full flex items-center justify-center">
              <p className="text-[var(--text-muted)]">검색 결과가 없습니다.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {results.customers.length > 0 && (
                <section>
                  <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-3 flex items-center"><UsersIcon className="h-6 w-6 mr-2 text-[var(--text-accent)]" />고객 ({results.customers.length})</h3>
                  <ul className="space-y-2">
                    {results.customers.map(({ customer, snippet }) => (
                      <li key={customer.id} onClick={() => handleSelectCustomer(customer)} className="p-3 bg-[var(--background-tertiary)] rounded-md border border-[var(--border-color)] hover:bg-[var(--background-primary)] cursor-pointer">
                        <p className="font-semibold text-[var(--text-primary)]">{customer.name}</p>
                        <p className="text-sm text-[var(--text-muted)]">{customer.contact} | {customer.occupation}</p>
                        {snippet && <p className="text-xs text-[var(--text-muted)] mt-1" dangerouslySetInnerHTML={{ __html: `<strong>매칭 내용:</strong> ${snippet}` }} />}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {results.appointments.length > 0 && (
                <section>
                  <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-3 flex items-center"><CalendarIcon className="h-6 w-6 mr-2 text-[var(--text-accent)]" />일정 ({results.appointments.length})</h3>
                  <ul className="space-y-2">
                    {results.appointments.map(({ appointment, snippet }) => (
                      <li key={appointment.id} onClick={() => handleSelectAppointment(appointment)} className="p-3 bg-[var(--background-tertiary)] rounded-md border border-[var(--border-color)] hover:bg-[var(--background-primary)] cursor-pointer">
                        <p className="font-semibold text-[var(--text-primary)]">{appointment.title || appointment.customerName}</p>
                        <p className="text-sm text-[var(--text-muted)]">{appointment.date} {appointment.time}</p>
                        {snippet && <p className="text-xs text-[var(--text-muted)] mt-1" dangerouslySetInnerHTML={{ __html: `<strong>매칭 내용:</strong> ${snippet}` }} />}
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {results.consultations.length > 0 && (
                <section>
                  <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-3 flex items-center"><DocumentTextIcon className="h-6 w-6 mr-2 text-[var(--text-accent)]" />상담 기록 ({results.consultations.length})</h3>
                   <ul className="space-y-2">
                    {results.consultations.map(({ customer, consultation, snippet }) => (
                      <li key={consultation.id} onClick={() => handleSelectConsultation(customer, consultation)} className="p-3 bg-[var(--background-tertiary)] rounded-md border border-[var(--border-color)] hover:bg-[var(--background-primary)] cursor-pointer">
                        <p className="font-semibold text-[var(--text-primary)]">{customer.name} - {new Date(consultation.date).toLocaleDateString()}</p>
                        {snippet && <p className="text-xs text-[var(--text-muted)] mt-1" dangerouslySetInnerHTML={{ __html: `<strong>매칭 내용:</strong> ${snippet}` }} />}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {results.contracts.length > 0 && (
                  <section>
                      <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-3 flex items-center"><BriefcaseIcon className="h-6 w-6 mr-2 text-[var(--text-accent)]" />계약 정보 ({results.contracts.length})</h3>
                      <ul className="space-y-2">
                          {results.contracts.map(({ customer, contract, snippet }) => (
                          <li key={contract.id} onClick={() => handleSelectContract(customer, contract)} className="p-3 bg-[var(--background-tertiary)] rounded-md border border-[var(--border-color)] hover:bg-[var(--background-primary)] cursor-pointer">
                              <p className="font-semibold text-[var(--text-primary)]">{customer.name} - {contract.productName}</p>
                              <p className="text-sm text-[var(--text-muted)]">{contract.insuranceCompany} | {contract.policyNumber}</p>
                              {snippet && <p className="text-xs text-[var(--text-muted)] mt-1" dangerouslySetInnerHTML={{ __html: `<strong>매칭 내용:</strong> ${snippet}` }} />}
                          </li>
                          ))}
                      </ul>
                  </section>
              )}
              {results.dailyReviews.length > 0 && (
                <section>
                  <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-3 flex items-center"><DocumentTextIcon className="h-6 w-6 mr-2 text-[var(--text-accent)]" />총평 ({results.dailyReviews.length})</h3>
                   <ul className="space-y-2">
                    {results.dailyReviews.map(({ review, snippet }) => (
                      <li key={review.date} onClick={handleSelectDailyReview} className="p-3 bg-[var(--background-tertiary)] rounded-md border border-[var(--border-color)] hover:bg-[var(--background-primary)] cursor-pointer">
                        <p className="font-semibold text-[var(--text-primary)]">{review.date}</p>
                        {snippet && <p className="text-xs text-[var(--text-muted)] mt-1" dangerouslySetInnerHTML={{ __html: `<strong>매칭 내용:</strong> ${snippet}` }} />}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {results.todos.length > 0 && (
                  <section>
                      <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-3 flex items-center"><CheckIcon className="h-6 w-6 mr-2 text-[var(--text-accent)]" />할 일 ({results.todos.length})</h3>
                      <ul className="space-y-2">
                          {results.todos.map(({ todo, snippet }) => (
                          <li key={todo.id} onClick={() => handleSelectTodo(todo)} className="p-3 bg-[var(--background-tertiary)] rounded-md border border-[var(--border-color)] hover:bg-[var(--background-primary)] cursor-pointer">
                              <p className="font-semibold text-[var(--text-primary)]">{todo.date}</p>
                              {snippet && <p className="text-xs text-[var(--text-muted)] mt-1" dangerouslySetInnerHTML={{ __html: `<strong>매칭 내용:</strong> ${snippet}` }} />}
                          </li>
                          ))}
                      </ul>
                  </section>
              )}
              {results.quickMemos.length > 0 && (
                  <section>
                      <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-3 flex items-center"><PencilIcon className="h-6 w-6 mr-2 text-[var(--text-accent)]" />간편 메모 ({results.quickMemos.length})</h3>
                      <ul className="space-y-2">
                          {results.quickMemos.map(({ memo, snippet }) => (
                          <li key={memo.id} onClick={() => handleSelectQuickMemo(memo)} className="p-3 bg-[var(--background-tertiary)] rounded-md border border-[var(--border-color)] hover:bg-[var(--background-primary)] cursor-pointer">
                              <p className="font-semibold text-[var(--text-primary)] truncate">{new Date(memo.createdAt).toLocaleDateString()}</p>
                              {snippet && <p className="text-xs text-[var(--text-muted)] mt-1" dangerouslySetInnerHTML={{ __html: `<strong>매칭 내용:</strong> ${snippet}` }} />}
                          </li>
                          ))}
                      </ul>
                  </section>
              )}
            </div>
          )}
        </div>
    </BaseModal>
  );
};

export default SearchResultsModal;