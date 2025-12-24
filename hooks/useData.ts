
import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { db } from '../services/db';
import type { Customer, AIExtractedProspectWithDetails, Appointment, Consultation, Script, Todo, DailyReview, Goal, Product, CallRecord, CallResult, RecurrenceSettings, CustomerTypeDefinition, PerformanceRecord, PerformancePrediction, ProfileInfo, QuickMemo, FavoriteGreeting, MessageTemplate, Contract, CustomerType, Habit, HabitLog, GoalBoard } from '../types';
import { geocodeAddress } from '../services/geminiService';
import { KoreanLunarCalendar } from '../services/lunarCalendar';

const formatPhoneNumberKR = (phone: string): string => {
    if (!phone || phone === '미확인') return phone;
    const cleaned = ('' + phone).replace(/\D/g, '');
    const match = cleaned.match(/^(\d{3})(\d{3,4})(\d{4})$/);
    if (match) {
      return [match[1], match[2], match[3]].join('-');
    }
    return phone;
};

const applyPremiumTags = (customer: Customer): Customer => {
    const totalPremium = (customer.contracts || [])
        .filter(c => c.status === 'active')
        .reduce((sum, c) => sum + c.monthlyPremium, 0);

    // Keep existing user-defined tags, remove old premium tags
    const userTags = (customer.tags || []).filter(tag => !tag.startsWith('월보험료'));
    const newTags = new Set(userTags);

    if (totalPremium >= 500000) {
        newTags.add('월보험료 50만원 이상');
    }
    if (totalPremium >= 300000) {
        newTags.add('월보험료 30만원 이상');
    }
    if (totalPremium >= 100000) {
        newTags.add('월보험료 10만원 이상');
    }

    return { ...customer, tags: Array.from(newTags) };
};

const normalizeCustomer = (customer: Customer): Customer => {
    const normalized = {
        ...customer,
        tags: Array.isArray(customer.tags) ? customer.tags : [],
        consultations: Array.isArray(customer.consultations) ? customer.consultations : [],
        productsOfInterest: Array.isArray(customer.productsOfInterest) ? customer.productsOfInterest : [],
        callHistory: Array.isArray(customer.callHistory) ? customer.callHistory : [],
        contracts: Array.isArray(customer.contracts) ? customer.contracts : [],
        namedAnniversaries: Array.isArray(customer.namedAnniversaries) ? customer.namedAnniversaries : [],
    };
    return applyPremiumTags(normalized);
};

const normalizeAppointment = (app: Appointment): Appointment => ({
    ...app,
    recurrenceDays: Array.isArray(app.recurrenceDays) ? app.recurrenceDays : [],
    exceptions: Array.isArray(app.exceptions) ? app.exceptions : [],
    keywords: Array.isArray(app.keywords) ? app.keywords : [],
    actionItems: Array.isArray(app.actionItems) ? app.actionItems : [],
});


// --- Customers Hook ---
export const useCustomers = () => {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [customersToMigrateCount, setCustomersToMigrateCount] = useState(0);

    useEffect(() => {
        const fetchCustomers = async () => {
            setIsLoading(true);
            try {
                let data = await db.customers.toArray();

                // --- START INTRODUCER MIGRATION LOGIC ---
                const MIGRATION_KEY = 'introducer_migration_done_v1';
                if (localStorage.getItem(MIGRATION_KEY) !== 'true' && data.length > 0) {
                    console.log("Running introducer migration...");
                    const customersToUpdate: Customer[] = [];
                    const customersForLookup = [...data];

                    for (const customer of data) {
                        if (customer.acquisitionSource === '소개' && customer.acquisitionSourceDetail && !customer.introducerId) {
                            const potentialIntroducers = customersForLookup.filter(c => c.name === customer.acquisitionSourceDetail);
                            
                            // Only update if there is a unique match and it's not a self-introduction
                            if (potentialIntroducers.length === 1 && potentialIntroducers[0].id !== customer.id) {
                                const updatedCustomer = { ...customer, introducerId: potentialIntroducers[0].id };
                                customersToUpdate.push(updatedCustomer);
                            }
                        }
                    }

                    if (customersToUpdate.length > 0) {
                        await db.customers.bulkPut(customersToUpdate);
                        // Re-read data from DB to ensure consistency
                        data = await db.customers.toArray();
                        console.log(`Migrated ${customersToUpdate.length} customers with introducerId.`);
                    }
                    
                    localStorage.setItem(MIGRATION_KEY, 'true');
                }
                // --- END INTRODUCER MIGRATION LOGIC ---

                let normalizedData = data.map(normalizeCustomer);

                setCustomers(normalizedData);
            } catch (e) {
                console.error("Failed to fetch customers", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchCustomers();
    }, []);

    // 주소 좌표 마이그레이션 *확인* 로직
    useEffect(() => {
        const MIGRATION_KEY = 'address_migration_done_v1';
        const checkMigration = async () => {
            if (localStorage.getItem(MIGRATION_KEY) || customers.length === 0) {
                setCustomersToMigrateCount(0);
                return;
            }

            const customersToMigrate = customers.filter(c => 
                (c.homeAddress && c.homeAddress !== '미확인' && c.homeLat === undefined) ||
                (c.workAddress && c.workAddress !== '미확인' && c.workLat === undefined)
            );

            setCustomersToMigrateCount(customersToMigrate.length);
        };

        if(!isLoading) {
            checkMigration();
        }
    }, [isLoading, customers]);

    const runAddressMigration = useCallback(async (onProgress: (current: number, total: number) => void) => {
        const MIGRATION_KEY = 'address_migration_done_v1';
        
        const allCustomers = await db.customers.toArray();
        const customersToMigrate = allCustomers.filter(c => 
            (c.homeAddress && c.homeAddress !== '미확인' && c.homeLat === undefined) ||
            (c.workAddress && c.workAddress !== '미확인' && c.workLat === undefined)
        );

        const total = customersToMigrate.length;
        if (total === 0) {
            localStorage.setItem(MIGRATION_KEY, 'true');
            setCustomersToMigrateCount(0);
            return;
        }
        
        onProgress(0, total);

        const BATCH_SIZE = 5;
        const DELAY_BETWEEN_BATCHES = 1000;
        let processedCount = 0;

        for (let i = 0; i < total; i += BATCH_SIZE) {
            const batch = customersToMigrate.slice(i, i + BATCH_SIZE);
            const updatedBatch = await Promise.all(batch.map(async (customer) => {
                const customerToUpdate = { ...customer };

                if (customer.homeAddress && customer.homeAddress !== '미확인' && customer.homeLat === undefined) {
                    const coords = await geocodeAddress(customer.homeAddress);
                    customerToUpdate.homeLat = coords?.lat ?? null;
                    customerToUpdate.homeLng = coords?.lng ?? null;
                }
                if (customer.workAddress && customer.workAddress !== '미확인' && customer.workLat === undefined) {
                    const coords = await geocodeAddress(customer.workAddress);
                    customerToUpdate.workLat = coords?.lat ?? null;
                    customerToUpdate.workLng = coords?.lng ?? null;
                }
                
                return customerToUpdate;
            }));

            if (updatedBatch.length > 0) {
                await db.customers.bulkPut(updatedBatch);
            }

            processedCount += batch.length;
            onProgress(Math.min(processedCount, total), total);
            
            if (i + BATCH_SIZE < total) {
                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
            }
        }
        
        localStorage.setItem(MIGRATION_KEY, 'true');
        const finalCustomers = await db.customers.toArray();
        setCustomers(finalCustomers.map(normalizeCustomer));
        setCustomersToMigrateCount(0);
    }, []);

    const geocodeAndUpdateCustomers = useCallback(async (
        addressesToGeocode: Map<string, Set<'home' | 'work'>>,
        onProgress: (current: number, total: number) => void
    ) => {
        const customerIds = Array.from(addressesToGeocode.keys());
        if (customerIds.length === 0) {
            onProgress(0, 0);
            return;
        }

        let totalToProcess = 0;
        addressesToGeocode.forEach(value => totalToProcess += value.size);

        onProgress(0, totalToProcess);

        const customersFromDb = await db.customers.bulkGet(customerIds) as (Customer | undefined)[];
        const customersToUpdate = customersFromDb.filter((c): c is Customer => c !== undefined);

        if (customersToUpdate.length === 0) {
            onProgress(totalToProcess, totalToProcess);
            return;
        }

        let processedCount = 0;
        const allUpdatedCustomers: Customer[] = [];

        const BATCH_SIZE = 5;
        const DELAY_BETWEEN_BATCHES = 1000;

        for (let i = 0; i < customersToUpdate.length; i += BATCH_SIZE) {
            const batch = customersToUpdate.slice(i, i + BATCH_SIZE);
            const updatedBatch = await Promise.all(batch.map(async (customer) => {
                const customerToUpdate = { ...customer };
                const addressTypes = addressesToGeocode.get(customer.id);

                if (addressTypes?.has('home') && customer.homeAddress && customer.homeAddress !== '미확인' && customer.homeLat === undefined) {
                    const coords = await geocodeAddress(customer.homeAddress);
                    customerToUpdate.homeLat = coords?.lat ?? null;
                    customerToUpdate.homeLng = coords?.lng ?? null;
                }
                if (addressTypes?.has('work') && customer.workAddress && customer.workAddress !== '미확인' && customer.workLat === undefined) {
                    const coords = await geocodeAddress(customer.workAddress);
                    customerToUpdate.workLat = coords?.lat ?? null;
                    customerToUpdate.workLng = coords?.lng ?? null;
                }
                processedCount += addressTypes?.size || 0;
                onProgress(Math.min(processedCount, totalToProcess), totalToProcess);

                return customerToUpdate;
            }));

            if (updatedBatch.length > 0) {
                allUpdatedCustomers.push(...updatedBatch);
            }

            if (i + BATCH_SIZE < customersToUpdate.length) {
                await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_BATCHES));
            }
        }
        
        if (allUpdatedCustomers.length > 0) {
            await db.customers.bulkPut(allUpdatedCustomers);
        }

        onProgress(totalToProcess, totalToProcess);
        const finalCustomers = await db.customers.toArray();
        setCustomers(finalCustomers.map(normalizeCustomer));
    }, []);


    const addCustomer = useCallback(async (prospects: AIExtractedProspectWithDetails[]) => {
        const newCustomers: Customer[] = prospects.map(prospect => {
            const d = new Date();
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const date = String(d.getDate()).padStart(2, '0');
            const todayStr = `${y}-${m}-${date}`;

            const newCustomer: Customer = {
                id: `${new Date().toISOString()}-${Math.random()}`,
                name: prospect.customerName,
                registrationDate: prospect.registrationDate || todayStr,
                contact: formatPhoneNumberKR(prospect.contact),
                birthday: prospect.dob.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3'),
                isBirthdayLunar: prospect.isBirthdayLunar,
                isBirthdayLeap: prospect.isBirthdayLeap,
                homeAddress: prospect.homeAddress,
                workAddress: prospect.workAddress,
                occupation: prospect.occupation,
                gender: prospect.gender,
                familyRelations: prospect.familyRelations,
                monthlyPremium: prospect.monthlyPremium,
                preferredContactTime: prospect.preferredContact,
                type: prospect.type,
                nextFollowUpDate: prospect.nextFollowUpDate,
                tags: prospect.isInterested ? ['관심고객'] : [],
                consultations: [],
                contracts: Array.isArray(prospect.contracts) ? prospect.contracts : [],
                callHistory: Array.isArray(prospect.callHistory) ? prospect.callHistory : [],
                productsOfInterest: [],
                medicalHistory: prospect.medicalHistory || '미확인',
                interests: prospect.interests || '미확인',
                acquisitionSource: prospect.acquisitionSource,
                acquisitionSourceDetail: prospect.acquisitionSourceDetail,
                introducerId: prospect.introducerId,
                namedAnniversaries: Array.isArray(prospect.namedAnniversaries) ? prospect.namedAnniversaries : [],
                notes: prospect.notes, // Always include notes
            };
            
            if (prospect.type === 'doctor_potential') {
                newCustomer.doctorType = prospect.doctorType;
                newCustomer.expectedOpeningDate = prospect.expectedOpeningDate;
                newCustomer.email = prospect.email;
                newCustomer.attendedSeminar = prospect.attendedSeminar;
                newCustomer.parkingAvailable = prospect.parkingAvailable;
                newCustomer.callResult = prospect.callResult;
                newCustomer.breakTime = prospect.breakTime;
            } else if (prospect.type === 'nurse_potential') {
                newCustomer.schoolAndAge = prospect.schoolAndAge;
                newCustomer.desiredStartDate = prospect.desiredStartDate;
                newCustomer.desiredConsultationTime = prospect.desiredConsultationTime;
                newCustomer.prospectingLocation = prospect.prospectingLocation;
                newCustomer.callResult = prospect.callResult;
            }

            return newCustomer;
        });

        await db.customers.bulkAdd(newCustomers);
        const allCustomers = await db.customers.toArray();
        setCustomers(allCustomers.map(normalizeCustomer));
    }, []);

    const updateCustomer = useCallback(async (updatedCustomer: Customer) => {
        const customerToSave = { 
            ...updatedCustomer,
            contact: formatPhoneNumberKR(updatedCustomer.contact),
        };
        await db.customers.put(customerToSave);
        setCustomers((prev: Customer[]) => prev.map((c: Customer) => c.id === customerToSave.id ? normalizeCustomer(customerToSave) : c));
    }, []);

    const deleteCustomer = useCallback(async (customerId: string) => {
        await db.customers.delete(customerId);
        setCustomers((prev: Customer[]) => prev.filter((c: Customer) => c.id !== customerId));
    }, []);
    
    const deleteMultipleCustomers = useCallback(async (customerIds: string[]) => {
        await db.customers.bulkDelete(customerIds);
        setCustomers((prev: Customer[]) => prev.filter((c: Customer) => !customerIds.includes(c.id)));
    }, []);

    const logCallResult = useCallback(async (
        customerId: string,
        result: CallResult,
        notes: string,
        followUpDate?: string
    ): Promise<Customer | undefined> => {
        const customer = await db.customers.get(customerId) as Customer | undefined;
        if (customer) {
            const normalizedCustomer = normalizeCustomer(customer);
            const newCallRecord: CallRecord = {
                id: Date.now().toString(),
                date: new Date().toISOString(),
                result,
                notes
            };
            
            const updatedCustomer = { ...normalizedCustomer };

            updatedCustomer.callHistory = [newCallRecord, ...normalizedCustomer.callHistory];
            
            if (followUpDate && followUpDate.trim().length > 0) {
                updatedCustomer.nextFollowUpDate = followUpDate;
            } else {
                updatedCustomer.nextFollowUpDate = undefined;
            }
            
            const finalCustomer = normalizeCustomer(updatedCustomer);
            await db.customers.put(finalCustomer);
            setCustomers((prev: Customer[]) => prev.map((c: Customer) => c.id === customerId ? finalCustomer : c));
            return finalCustomer;
        }
        return undefined;
    }, []);

    const bulkLogTouch = useCallback(async (customerIds: string[]) => {
        const customersToUpdate = await db.customers.bulkGet(customerIds) as (Customer | undefined)[];
        const updatedCustomers = customersToUpdate
            .filter((c): c is Customer => c !== undefined)
            .map((c: Customer): Customer => {
                const normalizedCustomer = normalizeCustomer(c);
                const newCallRecord: CallRecord = {
                    id: `touch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                    date: new Date().toISOString(),
                    result: 'other',
                    notes: '터치',
                };
                const updatedCallHistory = [newCallRecord, ...(normalizedCustomer.callHistory || [])];
                const updatedCustomer: Customer = { ...normalizedCustomer, callHistory: updatedCallHistory };
                return updatedCustomer;
            });
    
        if (updatedCustomers.length > 0) {
            await db.customers.bulkPut(updatedCustomers);
            setCustomers((prev: Customer[]): Customer[] => {
                const updatedMap = new Map(updatedCustomers.map((c: Customer) => [c.id, c]));
                return prev.map((c: Customer) => updatedMap.get(c.id) || c);
            });
        }
    }, []);

    const clearMultipleFollowUpDates = useCallback(async (customerIds: string[]) => {
        const customersToUpdate = await db.customers.bulkGet(customerIds) as (Customer | undefined)[];
        const updatedCustomers = customersToUpdate
            .filter((c): c is Customer => c !== undefined)
            .map(c => {
                const customerToUpdate = { ...c };
                customerToUpdate.nextFollowUpDate = undefined;
                return customerToUpdate;
            });

        if (updatedCustomers.length > 0) {
            const normalizedUpdatedCustomers = updatedCustomers.map(normalizeCustomer);
            await db.customers.bulkPut(normalizedUpdatedCustomers);
            setCustomers((prev: Customer[]): Customer[] => {
                const updatedMap = new Map(normalizedUpdatedCustomers.map((c: Customer) => [c.id, c]));
                return prev.map((c: Customer) => updatedMap.get(c.id) || c);
            });
        }
    }, []);

    const updateConsultation = useCallback(async (customerId: string, updatedConsultation: Consultation) => {
        const customer = await db.customers.get(customerId) as Customer | undefined;
        if (customer) {
            const normalizedCustomer = normalizeCustomer(customer as Customer);
            const updatedConsultations = normalizedCustomer.consultations.map(c => c.id === updatedConsultation.id ? updatedConsultation : c);
            const updatedCustomer: Customer = { ...normalizedCustomer, consultations: updatedConsultations };
            const finalCustomer = normalizeCustomer(updatedCustomer);
            await db.customers.put(finalCustomer);
            setCustomers((prev: Customer[]) => prev.map((c: Customer) => c.id === customerId ? finalCustomer : c));
            return finalCustomer;
        }
    }, []);

    const deleteConsultation = useCallback(async (customerId: string, consultationId: string, silent = false) => {
        if (!silent && !window.confirm('이 상담 기록을 정말로 삭제하시겠습니까?')) return;
        const customer = await db.customers.get(customerId) as Customer | undefined;
        if (customer) {
            const normalizedCustomer = normalizeCustomer(customer);
            const updatedConsultations = normalizedCustomer.consultations.filter(c => c.id !== consultationId);
            const updatedCustomer: Customer = { ...normalizedCustomer, consultations: updatedConsultations };
            const finalCustomer = normalizeCustomer(updatedCustomer);
            await db.customers.put(finalCustomer);
            setCustomers((prev: Customer[]) => prev.map((c: Customer) => c.id === customerId ? finalCustomer : c));
            return finalCustomer;
        }
    }, []);
    
    const deleteMultipleConsultations = useCallback(async (consultationsToDelete: Array<{ customerId: string; consultationId: string }>) => {
        const groupedByCustomer = consultationsToDelete.reduce((acc, curr) => {
            if (!acc[curr.customerId]) {
                acc[curr.customerId] = [];
            }
            acc[curr.customerId].push(curr.consultationId);
            return acc;
        }, {} as Record<string, string[]>);

        const customerIdsToUpdate = Object.keys(groupedByCustomer);
        if (customerIdsToUpdate.length === 0) return;

        const customersToUpdate = await db.customers.bulkGet(customerIdsToUpdate) as (Customer | undefined)[];

        const updatedCustomers = customersToUpdate
            .filter((c): c is Customer => c !== undefined)
            .map((customer): Customer => {
                const normalizedCustomer = normalizeCustomer(customer as Customer);
                const consultationIdsToDelete = new Set(groupedByCustomer[customer.id]);
                const updatedCustomer: Customer = {
                    ...normalizedCustomer,
                    consultations: normalizedCustomer.consultations.filter(c => !consultationIdsToDelete.has(c.id)),
                };
                return updatedCustomer;
            });

        if (updatedCustomers.length > 0) {
            const normalizedUpdatedCustomers = updatedCustomers.map(normalizeCustomer);
            await db.customers.bulkPut(normalizedUpdatedCustomers);
            const updatedCustomerMap = new Map(normalizedUpdatedCustomers.map((c: Customer) => [c.id, c]));
            setCustomers((prev: Customer[]): Customer[] => prev.map((c: Customer) => updatedCustomerMap.get(c.id) || c));
        }
    }, []);

    const bulkUpdateTags = useCallback(async (updates: {
        rename?: { from: string; to: string };
        merge?: { from: string[]; to: string };
        delete?: string[];
    }) => {
        const allCustomers = await db.customers.toArray();
        let customersToUpdate: Customer[] = [];

        if (updates.rename) {
            const { from, to } = updates.rename;
            customersToUpdate = allCustomers
                .filter(c => (c.tags || []).includes(from))
                .map(c => ({
                    ...c,
                    tags: Array.from(new Set((c.tags || []).map(t => t === from ? to : t)))
                }));
        } else if (updates.merge) {
            const { from, to } = updates.merge;
            const fromSet = new Set(from);
            customersToUpdate = allCustomers
                .filter(c => (c.tags || []).some(t => fromSet.has(t)))
                .map(c => ({
                    ...c,
                    tags: Array.from(new Set([...(c.tags || []).filter(t => !fromSet.has(t)), to]))
                }));
        } else if (updates.delete) {
            const toDelete = new Set(updates.delete);
            customersToUpdate = allCustomers
                .filter(c => (c.tags || []).some(t => toDelete.has(t)))
                .map(c => ({
                    ...c,
                    tags: (c.tags || []).filter(t => !toDelete.has(t))
                }));
        }
        
        if (customersToUpdate.length > 0) {
            await db.customers.bulkPut(customersToUpdate);
            const updatedCustomers = await db.customers.toArray();
            setCustomers(updatedCustomers.map(normalizeCustomer));
        }
    }, []);

    const updateCustomerTags = useCallback(async (customerIds: string[], tagsToAdd: string[], tagsToRemove: string[]) => {
        if (customerIds.length === 0) return;
        const customersToUpdate = await db.customers.bulkGet(customerIds) as (Customer | undefined)[];
        const updatedCustomers = customersToUpdate
            .filter((c): c is Customer => c !== undefined)
            .map((c): Customer => {
                const normalizedCustomer = normalizeCustomer(c as Customer);
                const newTags = new Set(normalizedCustomer.tags);
                tagsToAdd.forEach(tag => newTags.add(tag));
                tagsToRemove.forEach(tag => newTags.delete(tag));
                const updatedCustomer: Customer = { ...normalizedCustomer, tags: Array.from(newTags) };
                return updatedCustomer;
            });

        if (updatedCustomers.length > 0) {
            await db.customers.bulkPut(updatedCustomers);
            setCustomers((prev: Customer[]): Customer[] => {
                const updatedMap = new Map(updatedCustomers.map((c: Customer) => [c.id, c]));
                return prev.map((c: Customer) => updatedMap.get(c.id) || c);
            });
        }
    }, []);

    const bulkUpdateCustomerType = useCallback(async (customerIds: string[], newType: CustomerType) => {
        const customersToUpdate = await db.customers.bulkGet(customerIds) as (Customer | undefined)[];
        const updatedCustomers = customersToUpdate
            .filter((c): c is Customer => c !== undefined)
            .map((c): Customer => ({ ...c, type: newType }));

        if (updatedCustomers.length > 0) {
            await db.customers.bulkPut(updatedCustomers);
            setCustomers((prev: Customer[]): Customer[] => {
                const idsToUpdate = new Set(customerIds);
                return prev.map((c: Customer) => idsToUpdate.has(c.id) ? { ...c, type: newType } : c);
            });
        }
    }, []);

    const associateContractWithCustomer = useCallback(async (customerId: string | null, record: Omit<PerformanceRecord, 'id'>, customerType?: CustomerType) => {
        let customer: Customer | undefined;
        if (customerId) {
            customer = await db.customers.get(customerId) as Customer | undefined;
        } else {
            const existing = await db.customers.where('name').equals(record.contractorName).filter(c => c.birthday === record.dob).first() as Customer | undefined;
            if (existing) {
                customer = existing;
            }
        }
    
        if (!customer) {
            const d = new Date();
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const date = String(d.getDate()).padStart(2, '0');
            const todayStr = `${y}-${m}-${date}`;

            const newCustomer: Customer = {
                id: `customer-${Date.now()}`,
                name: record.contractorName,
                registrationDate: todayStr,
                birthday: record.dob,
                type: customerType || 'existing',
                contact: '미확인',
                homeAddress: '미확인',
                workAddress: '미확인',
                occupation: '미확인',
                tags: [],
                consultations: [],
                productsOfInterest: [],
                medicalHistory: '',
                interests: '',
                gender: '미확인',
                familyRelations: '미확인',
                monthlyPremium: '',
                preferredContactTime: '미확인',
                contracts: [],
                callHistory: []
            };
            await db.customers.add(newCustomer);
            customer = newCustomer;
        }
    
        const normalizedCustomer = normalizeCustomer(customer as Customer);

        const newContract: Contract = {
            id: `contract-${Date.now()}`,
            insuranceCompany: record.insuranceCompany,
            productName: record.productName,
            contractDate: record.applicationDate,
            monthlyPremium: record.premium,
            policyNumber: '미입력',
            paymentPeriod: '미입력',
            status: 'active',
            coverageCategory: record.coverageCategory
        };
    
        const customerWithNewContract: Customer = { ...normalizedCustomer, contracts: [...normalizedCustomer.contracts, newContract], type: 'existing' as const };
        const finalCustomer = normalizeCustomer(customerWithNewContract); // Re-normalize to get new tags
        
        await db.customers.put(finalCustomer);
        
        setCustomers((prev: Customer[]): Customer[] => {
            const customerExists = prev.some((c: Customer) => c.id === finalCustomer.id);
            if (customerExists) {
                return prev.map((c: Customer) => c.id === finalCustomer.id ? finalCustomer : c);
            } else {
                return [...prev, finalCustomer];
            }
        });
    }, []);


    return { customers, setCustomers, addCustomer, updateCustomer, deleteCustomer, deleteMultipleCustomers, logCallResult, bulkLogTouch, updateConsultation, deleteConsultation, deleteMultipleConsultations, clearMultipleFollowUpDates, isLoading, bulkUpdateTags, updateCustomerTags, customersToMigrateCount, runAddressMigration, geocodeAndUpdateCustomers, bulkUpdateCustomerType, associateContractWithCustomer };
};

// --- Appointments Hook ---
export const useAppointments = () => {
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        const fetchAppointments = async () => {
            setIsLoading(true);
            try {
                const data = await db.appointments.toArray();
                const normalizedData = data.map(normalizeAppointment);
                setAppointments(normalizedData);
            } catch (e) {
                console.error("Failed to fetch appointments", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchAppointments();
    }, []);

    const addAppointment = useCallback(async (
        appointmentData: Omit<Appointment, 'id' | 'status'>,
        consultationData?: { consultation: Omit<Consultation, 'date' | 'id'>, date: string },
        recurrence?: RecurrenceSettings,
        status: Appointment['status'] = 'scheduled'
    ): Promise<Customer | undefined> => {
        const newAppointment: Appointment = {
            id: `appt-${Date.now()}`,
            ...appointmentData,
            status,
        };

        if (recurrence && recurrence.type !== 'none') {
            newAppointment.recurrenceType = recurrence.type;
            newAppointment.recurrenceInterval = recurrence.interval;
            newAppointment.recurrenceDays = recurrence.days;
            newAppointment.recurrenceEndDate = recurrence.endDate;
        }

        await db.appointments.add(newAppointment);
        setAppointments(prev => [...prev, normalizeAppointment(newAppointment)]);
        
        let updatedCustomer: Customer | undefined;
        if (consultationData && newAppointment.customerId && !newAppointment.customerId.startsWith('unregistered-')) {
            const customer = await db.customers.get(newAppointment.customerId) as Customer | undefined;
            if (customer) {
                const normalizedCustomer = normalizeCustomer(customer as Customer);
                const newConsultation: Consultation = {
                    ...consultationData.consultation,
                    id: `consult-${Date.now()}`,
                    date: new Date(consultationData.date).toISOString(),
                };
                const updatedConsultations = [...normalizedCustomer.consultations, newConsultation];
                updatedCustomer = { ...normalizedCustomer, consultations: updatedConsultations };
                const finalCustomer = normalizeCustomer(updatedCustomer);
                await db.customers.put(finalCustomer);
                return finalCustomer;
            }
        }
        return updatedCustomer;
    }, []);

    const updateAppointment = useCallback(async (
        updatedAppointment: Appointment,
        consultationData?: { consultation: Omit<Consultation, 'date' | 'id'>, date: string },
        recurrence?: RecurrenceSettings
    ): Promise<Customer | undefined> => {
        
        const appointmentToSave: Appointment = { ...updatedAppointment };
        if (recurrence) {
            appointmentToSave.recurrenceType = recurrence.type;
            appointmentToSave.recurrenceInterval = recurrence.interval;
            appointmentToSave.recurrenceDays = recurrence.days;
            appointmentToSave.recurrenceEndDate = recurrence.endDate;
        }

        await db.appointments.put(appointmentToSave);
        setAppointments(prev => prev.map(a => a.id === appointmentToSave.id ? normalizeAppointment(appointmentToSave) : a));

        let updatedCustomer: Customer | undefined;
        if (consultationData && appointmentToSave.customerId && !appointmentToSave.customerId.startsWith('unregistered-')) {
             const customer = await db.customers.get(appointmentToSave.customerId) as Customer | undefined;
            if (customer) {
                const normalizedCustomer = normalizeCustomer(customer);
                const newConsultation: Consultation = {
                    ...consultationData.consultation,
                    id: `consult-${Date.now()}`,
                    date: new Date(consultationData.date).toISOString(),
                };
                const updatedConsultations = [...normalizedCustomer.consultations, newConsultation];
                updatedCustomer = { ...normalizedCustomer, consultations: updatedConsultations };
                const finalCustomer = normalizeCustomer(updatedCustomer);
                await db.customers.put(finalCustomer);
                return finalCustomer;
            }
        }
        return updatedCustomer;
    }, []);

    const deleteAppointment = useCallback(async (appointmentId: string) => {
        await db.appointments.delete(appointmentId);
        setAppointments(prev => prev.filter(a => a.id !== appointmentId));
    }, []);

    const deleteMultipleAppointments = useCallback(async (appointmentIds: string[]) => {
        await db.appointments.bulkDelete(appointmentIds);
        setAppointments(prev => prev.filter(a => !appointmentIds.includes(a.id)));
    }, []);
    
    const deleteAppointmentsByCustomerIds = useCallback(async (customerIds: string[]) => {
        const idsToDelete: string[] = [];
        await db.appointments.where('customerId').anyOf(customerIds).each(app => {
            idsToDelete.push(app.id);
        });
        if (idsToDelete.length > 0) {
            await db.appointments.bulkDelete(idsToDelete);
            setAppointments(prev => prev.filter(a => !idsToDelete.includes(a.id)));
        }
    }, []);

    const updateAppointmentStatus = useCallback(async (appointmentId: string, status: Appointment['status']) => {
        await db.appointments.update(appointmentId, { status });
        setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, status } : a));
    }, []);
    
    const updateMultipleAppointmentStatuses = useCallback(async (appointmentsToUpdate: Appointment[]) => {
        const updates = appointmentsToUpdate.map(app => ({ key: app.id, changes: { status: app.status } }));
        await db.appointments.bulkUpdate(updates);
        setAppointments(prev => {
            const updateMap = new Map(appointmentsToUpdate.map(app => [app.id, app.status]));
            return prev.map(app => updateMap.has(app.id) ? { ...app, status: updateMap.get(app.id)! } : app);
        });
    }, []);
    
    const addAppointmentException = useCallback(async (appointmentId: string, exceptionDate: string) => {
        const appointment = await db.appointments.get(appointmentId);
        if (appointment) {
            const exceptions = [...(appointment.exceptions || []), exceptionDate];
            await db.appointments.update(appointmentId, { exceptions });
            setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, exceptions } : a));
        }
    }, []);
    
    const endRecurrence = useCallback(async (appointmentId: string, endDate: string) => {
        await db.appointments.update(appointmentId, { recurrenceEndDate: endDate });
        setAppointments(prev => prev.map(a => a.id === appointmentId ? { ...a, recurrenceEndDate: endDate } : a));
    }, []);
    
    return { appointments, setAppointments, addAppointment, updateAppointment, deleteAppointment, addAppointmentException, endRecurrence, deleteMultipleAppointments, updateAppointmentStatus, updateMultipleAppointmentStatuses, deleteAppointmentsByCustomerIds, isLoading };
};

// --- Other Hooks ---
export const useScripts = () => {
    const [scripts, setScripts] = useState<Script[]>([]);
    useEffect(() => { db.scripts.toArray().then(setScripts); }, []);
    const saveScript = useCallback(async (script: Script) => {
        await db.scripts.put(script);
        setScripts(await db.scripts.toArray());
    }, []);
    const deleteScript = useCallback(async (scriptId: string) => {
        await db.scripts.delete(scriptId);
        setScripts(await db.scripts.toArray());
    }, []);
    return { scripts, setScripts, saveScript, deleteScript };
};

export const useTodos = () => {
    const [todos, setTodos] = useState<Todo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => { db.todos.toArray().then(data => { setTodos(data); setIsLoading(false); }); }, []);

    const addTodo = useCallback(async (text: string, priority: Todo['priority'], date?: string) => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dt = String(d.getDate()).padStart(2, '0');
        const todayStr = `${y}-${m}-${dt}`;

        const newTodo: Todo = {
            id: `todo-${Date.now()}`, text, completed: false,
            date: date || todayStr,
            priority,
        };
        await db.todos.add(newTodo);
        setTodos(prev => [...prev, newTodo]);
    }, []);

    const toggleTodo = useCallback(async (id: string) => {
        const todo = await db.todos.get(id);
        if (todo) {
            await db.todos.update(id, { completed: !todo.completed });
            setTodos(prev => prev.map(t => t.id === id ? { ...t, completed: !t.completed } : t));
        }
    }, []);
    
    const deleteTodo = useCallback(async (id: string) => {
        await db.todos.delete(id);
        setTodos(prev => prev.filter(t => t.id !== id));
    }, []);
    
    const updateTodo = useCallback(async (id: string, data: { text: string; priority: Todo['priority'] }) => {
        await db.todos.update(id, data);
        setTodos(prev => prev.map(t => t.id === id ? { ...t, ...data } : t));
    }, []);

    const rolloverTodos = useCallback(async () => {
        const d = new Date();
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dt = String(d.getDate()).padStart(2, '0');
        const todayStr = `${y}-${m}-${dt}`;

        const todosToUpdate = await db.todos.where('date').below(todayStr).and(item => !item.completed).toArray();
        if (todosToUpdate.length > 0) {
            const updates = todosToUpdate.map(todo => ({ key: todo.id, changes: { date: todayStr } }));
            await db.todos.bulkUpdate(updates);
            const allTodos = await db.todos.toArray();
            setTodos(allTodos);
        }
    }, []);
    
    return { todos, setTodos, addTodo, toggleTodo, deleteTodo, updateTodo, rolloverTodos, isLoading };
};

export const useDailyReviews = () => {
    const [dailyReviews, setDailyReviews] = useState<DailyReview[]>([]);
    useEffect(() => { db.dailyReviews.toArray().then(setDailyReviews); }, []);
    const saveDailyReview = useCallback(async (review: DailyReview) => {
        await db.dailyReviews.put(review);
        setDailyReviews(await db.dailyReviews.toArray());
    }, []);
    const deleteDailyReview = useCallback(async (date: string) => {
        await db.dailyReviews.delete(date);
        setDailyReviews(await db.dailyReviews.toArray());
    }, []);
    const deleteMultipleDailyReviews = useCallback(async (dates: string[]) => {
        await db.dailyReviews.bulkDelete(dates);
        setDailyReviews(await db.dailyReviews.toArray());
    }, []);
    return { dailyReviews, setDailyReviews, saveDailyReview, deleteDailyReview, deleteMultipleDailyReviews };
};

export const useGoals = () => {
    const [goals, setGoals] = useState<Goal[]>([]);
    useEffect(() => { db.goals.toArray().then(setGoals); }, []);
    const addGoal = useCallback(async (goal: Omit<Goal, 'id'>) => {
        const newGoal = { ...goal, id: `goal-${Date.now()}`};
        await db.goals.add(newGoal);
        setGoals(await db.goals.toArray());
    }, []);
    const updateGoal = useCallback(async (goal: Goal) => {
        await db.goals.put(goal);
        setGoals(await db.goals.toArray());
    }, []);
    const deleteGoal = useCallback(async (goalId: string) => {
        await db.goals.delete(goalId);
        setGoals(await db.goals.toArray());
    }, []);
    return { goals, setGoals, addGoal, updateGoal, deleteGoal };
};

export const useProducts = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => { db.products.toArray().then(data => { setProducts(data); setIsLoading(false); }); }, []);
    const addProduct = useCallback(async (product: Omit<Product, 'id'>) => {
        const newProduct = { ...product, id: `prod-${Date.now()}`};
        await db.products.add(newProduct);
        setProducts(await db.products.toArray());
    }, []);
    const updateProduct = useCallback(async (product: Product) => {
        await db.products.put(product);
        setProducts(await db.products.toArray());
    }, []);
    const deleteProduct = useCallback(async (productId: string) => {
        await db.products.delete(productId);
        setProducts(await db.products.toArray());
    }, []);
    return { products, setProducts, addProduct, updateProduct, deleteProduct, isLoading };
};

export const useCustomerTypes = () => {
    const [customerTypes, setCustomerTypes] = useState<CustomerTypeDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => { db.customerTypes.toArray().then(data => { setCustomerTypes(data); setIsLoading(false); }); }, []);
    const addCustomerType = useCallback(async (newType: { id: string, label: string }) => {
        const existing = await db.customerTypes.get(newType.id);
        if (existing) {
            throw new Error("이미 존재하는 유형 ID입니다.");
        }
        await db.customerTypes.add({ ...newType, isDefault: false });
        setCustomerTypes(await db.customerTypes.toArray());
    }, []);
    const updateCustomerType = useCallback(async (updatedType: CustomerTypeDefinition) => {
        await db.customerTypes.put(updatedType);
        setCustomerTypes(await db.customerTypes.toArray());
    }, []);
    const deleteCustomerType = useCallback(async (typeId: string) => {
        const customerWithThisType = await db.customers.where('type').equals(typeId).first();
        if (customerWithThisType) {
            throw new Error("해당 유형을 사용하는 고객이 있어 삭제할 수 없습니다.");
        }
        await db.customerTypes.delete(typeId);
        setCustomerTypes(await db.customerTypes.toArray());
    }, []);
    return { customerTypes, setCustomerTypes, addCustomerType, updateCustomerType, deleteCustomerType, isLoading };
};

export const usePerformanceRecords = () => {
    const [performanceRecords, setPerformanceRecords] = useState<PerformanceRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => { db.performanceRecords.orderBy('applicationDate').reverse().toArray().then(data => { setPerformanceRecords(data); setIsLoading(false); }); }, []);
    const addPerformanceRecord = useCallback(async (records: Omit<PerformanceRecord, 'id'> | Omit<PerformanceRecord, 'id'>[]) => {
        const recordsToAdd = Array.isArray(records) ? records : [records];
        const newRecords = recordsToAdd.map(r => ({ ...r, id: `perf-${Date.now()}-${Math.random()}`}));
        await db.performanceRecords.bulkAdd(newRecords);
        setPerformanceRecords(await db.performanceRecords.orderBy('applicationDate').reverse().toArray());
    }, []);
    const updatePerformanceRecord = useCallback(async (record: PerformanceRecord) => {
        await db.performanceRecords.put(record);
        setPerformanceRecords(await db.performanceRecords.orderBy('applicationDate').reverse().toArray());
    }, []);
    const deletePerformanceRecord = useCallback(async (recordId: string) => {
        await db.performanceRecords.delete(recordId);
        setPerformanceRecords(await db.performanceRecords.orderBy('applicationDate').reverse().toArray());
    }, []);
    return { performanceRecords, setPerformanceRecords, addPerformanceRecord, updatePerformanceRecord, deletePerformanceRecord, isLoading };
};

export const usePerformancePredictions = () => {
    const [performancePredictions, setPerformancePredictions] = useState<PerformancePrediction[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => { db.performancePredictions.orderBy('pcDate').toArray().then(data => { setPerformancePredictions(data); setIsLoading(false); }); }, []);
    const addPerformancePrediction = useCallback(async (prediction: Omit<PerformancePrediction, 'id'>) => {
        const newPrediction = { ...prediction, id: `pred-${Date.now()}`};
        await db.performancePredictions.add(newPrediction);
        setPerformancePredictions(await db.performancePredictions.orderBy('pcDate').toArray());
    }, []);
    const updatePerformancePrediction = useCallback(async (prediction: PerformancePrediction) => {
        await db.performancePredictions.put(prediction);
        setPerformancePredictions(await db.performancePredictions.orderBy('pcDate').toArray());
    }, []);
    const deletePerformancePrediction = useCallback(async (predictionId: string) => {
        await db.performancePredictions.delete(predictionId);
        setPerformancePredictions(await db.performancePredictions.orderBy('pcDate').toArray());
    }, []);
    return { performancePredictions, setPerformancePredictions, addPerformancePrediction, updatePerformancePrediction, deletePerformancePrediction, isLoading };
};

export const useProfileInfo = () => {
    const [profileInfo, setProfileInfo] = useState<ProfileInfo | null>(null);
    useEffect(() => { db.profileInfo.get('user_profile').then(setProfileInfo); }, []);
    const saveProfileInfo = useCallback(async (profile: ProfileInfo) => {
        await db.profileInfo.put(profile);
        setProfileInfo(profile);
    }, []);
    return { profileInfo, setProfileInfo, saveProfileInfo };
};

export const useQuickMemos = () => {
    const [quickMemos, setQuickMemos] = useState<QuickMemo[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => { db.quickMemos.orderBy('createdAt').reverse().toArray().then(data => { setQuickMemos(data); setIsLoading(false); }); }, []);
    const addQuickMemo = useCallback(async (text: string, color: string) => {
        const tagRegex = /#([^\s#]+)/g;
        const tags = [...text.matchAll(tagRegex)].map(match => match[1]);
        const cleanText = text.replace(tagRegex, '').trim();
        const newMemo: QuickMemo = { text: cleanText, color, tags, id: `memo-${Date.now()}`, createdAt: new Date().toISOString() };
        await db.quickMemos.add(newMemo);
        setQuickMemos(await db.quickMemos.orderBy('createdAt').reverse().toArray());
    }, []);
    const updateQuickMemo = useCallback(async (memo: QuickMemo) => {
        await db.quickMemos.put(memo);
        setQuickMemos(await db.quickMemos.orderBy('createdAt').reverse().toArray());
    }, []);
    const deleteQuickMemo = useCallback(async (memoId: string) => {
        await db.quickMemos.delete(memoId);
        setQuickMemos(await db.quickMemos.orderBy('createdAt').reverse().toArray());
    }, []);
    const deleteMultipleQuickMemos = useCallback(async (memoIds: string[]) => {
        await db.quickMemos.bulkDelete(memoIds);
        setQuickMemos(await db.quickMemos.orderBy('createdAt').reverse().toArray());
    }, []);
    return { quickMemos, setQuickMemos, addQuickMemo, updateQuickMemo, deleteQuickMemo, deleteMultipleQuickMemos, isLoading };
};

export const useFavoriteGreetings = () => {
    const [greetings, setGreetings] = useState<FavoriteGreeting[]>([]);
    useEffect(() => { db.favoriteGreetings.orderBy('createdAt').reverse().toArray().then(setGreetings); }, []);
    const addFavoriteGreeting = useCallback(async (content: string) => {
        const newGreeting: FavoriteGreeting = { content, id: `greet-${Date.now()}`, createdAt: new Date().toISOString() };
        await db.favoriteGreetings.add(newGreeting);
        setGreetings(await db.favoriteGreetings.orderBy('createdAt').reverse().toArray());
    }, []);
    const deleteFavoriteGreeting = useCallback(async (id: string) => {
        await db.favoriteGreetings.delete(id);
        setGreetings(await db.favoriteGreetings.orderBy('createdAt').reverse().toArray());
    }, []);
    return { greetings, setGreetings, addFavoriteGreeting, deleteFavoriteGreeting };
};

export const useMessageTemplates = () => {
    const [templates, setTemplates] = useState<MessageTemplate[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => { db.messageTemplates.orderBy('createdAt').reverse().toArray().then(data => { setTemplates(data); setIsLoading(false); }); }, []);
    const addTemplate = useCallback(async (template: Omit<MessageTemplate, 'id' | 'createdAt'>) => {
        const newTemplate = { ...template, id: `template-${Date.now()}`, createdAt: new Date().toISOString() };
        await db.messageTemplates.add(newTemplate);
        setTemplates(await db.messageTemplates.orderBy('createdAt').reverse().toArray());
    }, []);
    const updateTemplate = useCallback(async (template: MessageTemplate) => {
        await db.messageTemplates.put(template);
        setTemplates(await db.messageTemplates.orderBy('createdAt').reverse().toArray());
    }, []);
    const deleteTemplate = useCallback(async (id: string) => {
        await db.messageTemplates.delete(id);
        setTemplates(await db.messageTemplates.orderBy('createdAt').reverse().toArray());
    }, []);
    return { templates, setTemplates, addTemplate, updateTemplate, deleteTemplate, isLoading };
};

export const useHabits = () => {
    const [habits, setHabits] = useState<Habit[]>([]);
    const [habitLogs, setHabitLogs] = useState<HabitLog[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const isInitialLoad = useRef(true);

    const fetchData = useCallback(async () => {
        if (isInitialLoad.current) {
            setIsLoading(true);
        }
        const [h, l] = await Promise.all([
            db.habits.orderBy('createdAt').toArray(),
            db.habitLogs.toArray()
        ]);
        setHabits(h);
        setHabitLogs(l);
        if (isInitialLoad.current) {
            setIsLoading(false);
            isInitialLoad.current = false;
        }
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const addHabit = useCallback(async (habit: Omit<Habit, 'id' | 'createdAt'>) => {
        const newHabit = { ...habit, id: `habit-${Date.now()}`, createdAt: new Date().toISOString() };
        await db.habits.add(newHabit);
        fetchData();
    }, [fetchData]);
    const updateHabit = useCallback(async (habit: Habit) => {
        await db.habits.put(habit);
        fetchData();
    }, [fetchData]);
    const deleteHabit = useCallback(async (habitId: string) => {
        await db.transaction('rw', db.habits, db.habitLogs, async () => {
            await db.habits.delete(habitId);
            await db.habitLogs.where({ habitId }).delete();
        });
        fetchData();
    }, [fetchData]);
    const logHabit = useCallback(async (habitId: string, date: string, completed: boolean) => {
        const existingLog = await db.habitLogs.where({ habitId, date }).first();
        if (existingLog) {
            await db.habitLogs.update(existingLog.id, { completed });
        } else {
            const newLog: Omit<HabitLog, 'id'> = { habitId, date, completed };
            await db.habitLogs.add(newLog as HabitLog);
        }
        fetchData();
    }, [fetchData]);

    return { habits, habitLogs, addHabit, updateHabit, deleteHabit, logHabit, isLoading };
};

export const useGoalBoards = () => {
    const [goalBoards, setGoalBoards] = useState<GoalBoard[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => { db.goalBoards.orderBy('createdAt').reverse().toArray().then(data => { setGoalBoards(data); setIsLoading(false); }); }, []);
    const addGoalBoard = useCallback(async (board: Omit<GoalBoard, 'id' | 'createdAt'>) => {
        const newBoard = { ...board, id: `gboard-${Date.now()}`, createdAt: new Date().toISOString() };
        await db.goalBoards.add(newBoard);
        setGoalBoards(await db.goalBoards.orderBy('createdAt').reverse().toArray());
    }, []);
    const updateGoalBoard = useCallback(async (board: GoalBoard) => {
        await db.goalBoards.put(board);
        setGoalBoards(await db.goalBoards.orderBy('createdAt').reverse().toArray());
    }, []);
    const deleteGoalBoard = useCallback(async (boardId: string) => {
        await db.goalBoards.delete(boardId);
        setGoalBoards(await db.goalBoards.orderBy('createdAt').reverse().toArray());
    }, []);
    return { goalBoards, setGoalBoards, addGoalBoard, updateGoalBoard, deleteGoalBoard, isLoading };
};

// FIX: Add useLunarCalendar hook
export const useLunarCalendar = () => {
    return useMemo(() => new KoreanLunarCalendar(), []);
};
