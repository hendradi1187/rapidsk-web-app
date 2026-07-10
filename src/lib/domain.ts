// Active governance domain_id disetel oleh DomainContext dan hidup per sesi FE.
let activeDomainId: string | null = null;

export const getActiveDomainId = (): string | null => activeDomainId;

export const setActiveDomainId = (id: string | null): void => {
  activeDomainId = id;
};
