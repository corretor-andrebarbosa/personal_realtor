/**
 * Storage Manager - IndexedDB com fallback para localStorage
 * Funciona em abas anônimas/privadas quando localStorage está desabilitado
 */

const DB_NAME = 'real-estate-platform';
const DB_VERSION = 1;
const STORE_NAME = 'leads';

class StorageManager {
  constructor() {
    this.db = null;
    this.isIndexedDBAvailable = false;
    this.isLocalStorageAvailable = false;
    this.initPromise = this.init();
  }

  async init() {
    console.log('🔧 Inicializando StorageManager...');
    
    // Verifica localStorage primeiro (mais rápido)
    try {
      const test = '__ls_test__';
      localStorage.setItem(test, test);
      localStorage.removeItem(test);
      this.isLocalStorageAvailable = true;
      console.log('✅ localStorage disponível');
    } catch (error) {
      console.warn('⚠️ localStorage indisponível:', error.message);
      this.isLocalStorageAvailable = false;
    }

    // Verifica IndexedDB
    if ('indexedDB' in window) {
      try {
        return new Promise((resolve) => {
          const request = indexedDB.open(DB_NAME, DB_VERSION);
          
          request.onerror = () => {
            console.warn('⚠️ IndexedDB indisponível');
            this.isIndexedDBAvailable = false;
            resolve();
          };

          request.onsuccess = () => {
            this.db = request.result;
            this.isIndexedDBAvailable = true;
            console.log('✅ IndexedDB inicializado');
            resolve();
          };

          request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
              db.createObjectStore(STORE_NAME, { keyPath: 'id' });
              console.log('✅ IndexedDB store criada');
            }
          };
        });
      } catch (error) {
        console.warn('⚠️ Erro ao inicializar IndexedDB:', error.message);
        this.isIndexedDBAvailable = false;
      }
    }
  }

  async getLeads() {
    await this.initPromise;

    // Tenta IndexedDB primeiro
    if (this.isIndexedDBAvailable && this.db) {
      try {
        const leads = await this._getFromIndexedDB();
        if (leads && leads.length > 0) {
          console.log('✅ Leads lidos de IndexedDB:', leads.length);
          return leads;
        }
      } catch (error) {
        console.warn('⚠️ Erro ao ler de IndexedDB:', error.message);
      }
    }

    // Fallback para localStorage
    if (this.isLocalStorageAvailable) {
      try {
        const saved = localStorage.getItem('ab-leads');
        if (saved) {
          const leads = JSON.parse(saved);
          console.log('✅ Leads lidos de localStorage:', leads.length);
          return leads;
        }
      } catch (error) {
        console.warn('⚠️ Erro ao ler localStorage:', error.message);
      }
    }

    console.log('ℹ️ Nenhum lead encontrado');
    return [];
  }

  async saveLeads(leads) {
    await this.initPromise;

    const savedSuccessfully = [];

    // Salva em IndexedDB
    if (this.isIndexedDBAvailable && this.db) {
      try {
        await this._saveToIndexedDB(leads);
        savedSuccessfully.push('IndexedDB');
      } catch (error) {
        console.warn('⚠️ Erro ao salvar em IndexedDB:', error.message);
      }
    }

    // Salva em localStorage
    if (this.isLocalStorageAvailable) {
      try {
        localStorage.setItem('ab-leads', JSON.stringify(leads));
        savedSuccessfully.push('localStorage');
      } catch (error) {
        console.warn('⚠️ Erro ao salvar em localStorage:', error.message);
      }
    }

    if (savedSuccessfully.length === 0) {
      console.error('❌ Nenhum armazenamento disponível!');
      return false;
    }

    console.log(`✅ Leads salvos em: ${savedSuccessfully.join(' + ')}`);
    return true;
  }

  async addLead(lead) {
    await this.initPromise;
    
    const leads = await this.getLeads();
    leads.unshift(lead);
    await this.saveLeads(leads);
    console.log('✅ Lead adicionado:', lead.name);
    return lead;
  }

  async updateLead(id, updates) {
    await this.initPromise;
    
    const leads = await this.getLeads();
    const index = leads.findIndex(l => l.id === id);
    if (index !== -1) {
      leads[index] = { ...leads[index], ...updates };
      await this.saveLeads(leads);
      return leads[index];
    }
    return null;
  }

  async deleteLead(id) {
    await this.initPromise;
    
    const leads = await this.getLeads();
    const filtered = leads.filter(l => l.id !== id);
    await this.saveLeads(filtered);
    return true;
  }

  // Métodos privados para IndexedDB
  _getFromIndexedDB() {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB não inicializado'));
        return;
      }

      try {
        const transaction = this.db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.getAll();

        request.onsuccess = () => {
          resolve(request.result || []);
        };

        request.onerror = () => {
          reject(new Error('Erro ao ler IndexedDB'));
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  _saveToIndexedDB(leads) {
    return new Promise((resolve, reject) => {
      if (!this.db) {
        reject(new Error('IndexedDB não inicializado'));
        return;
      }

      try {
        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        
        // Limpa e reinsere todos os leads
        store.clear();
        leads.forEach((lead) => {
          store.add(lead);
        });

        transaction.oncomplete = () => {
          resolve();
        };

        transaction.onerror = () => {
          reject(new Error('Erro ao salvar em IndexedDB'));
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  // Método para limpar tudo (debug)
  async clear() {
    await this.initPromise;

    if (this.isIndexedDBAvailable && this.db) {
      await this._clearIndexedDB();
    }

    if (this.isLocalStorageAvailable) {
      try {
        localStorage.removeItem('ab-leads');
      } catch (error) {
        console.warn('Erro ao limpar localStorage:', error.message);
      }
    }
    
    console.log('🗑️ Todos os dados foram limpos');
  }

  _clearIndexedDB() {
    return new Promise((resolve) => {
      if (!this.db) {
        resolve();
        return;
      }

      try {
        const transaction = this.db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.clear();

        transaction.oncomplete = () => {
          resolve();
        };
      } catch (error) {
        resolve();
      }
    });
  }

  // Método para debug
  async getStats() {
    await this.initPromise;
    return {
      isIndexedDBAvailable: this.isIndexedDBAvailable,
      isLocalStorageAvailable: this.isLocalStorageAvailable,
      leads: await this.getLeads()
    };
  }
}

export const storageManager = new StorageManager();
