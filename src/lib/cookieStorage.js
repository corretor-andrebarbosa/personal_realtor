/**
 * Cookie Storage - Funciona em abas anônimas e compartilhado entre abas
 * Usa Cookies em vez de localStorage/IndexedDB
 */

class CookieStorage {
  constructor() {
    this.COOKIE_NAME = 'ab-leads-shared';
    this.MAX_SIZE = 4000; // Cookies têm limite de ~4KB
  }

  // Salva um objeto em cookie
  async set(data) {
    try {
      const json = JSON.stringify(data);
      
      // Se for muito grande, comprime apenas as informações essenciais
      if (json.length > this.MAX_SIZE) {
        console.warn(`⚠️ Dados muito grandes para cookie (${json.length} bytes). Comprimindo...`);
        // Salva apenas os campos essenciais
        const compressed = data.slice(0, 10).map(lead => ({
          id: lead.id,
          name: lead.name,
          phone: lead.phone,
          interest: lead.interest,
          budget: lead.budget,
          status: lead.status
        }));
        const compressedJson = JSON.stringify(compressed);
        this.setCookie(this.COOKIE_NAME, compressedJson);
        console.log('✅ Dados comprimidos salvos em cookie');
        return true;
      }

      this.setCookie(this.COOKIE_NAME, json);
      console.log('✅ Dados salvos em cookie compartilhado');
      return true;
    } catch (error) {
      console.error('❌ Erro ao salvar em cookie:', error);
      return false;
    }
  }

  // Recupera dados do cookie
  async get() {
    try {
      const value = this.getCookie(this.COOKIE_NAME);
      if (value) {
        const data = JSON.parse(value);
        console.log('✅ Dados lidos do cookie compartilhado:', data.length);
        return data;
      }
      return [];
    } catch (error) {
      console.error('❌ Erro ao ler cookie:', error);
      return [];
    }
  }

  // Métodos privados para manipular cookies
  setCookie(name, value) {
    // SameSite=None permite acesso em abas anônimas
    // Secure requer HTTPS
    const isHttps = window.location.protocol === 'https:';
    const sameSite = isHttps ? 'SameSite=None; Secure' : '';
    
    document.cookie = `${name}=${encodeURIComponent(value)}; path=/; ${sameSite}`;
  }

  getCookie(name) {
    const nameEQ = name + '=';
    const cookies = document.cookie.split(';');
    
    for (let cookie of cookies) {
      cookie = cookie.trim();
      if (cookie.indexOf(nameEQ) === 0) {
        return decodeURIComponent(cookie.substring(nameEQ.length));
      }
    }
    
    return null;
  }

  removeCookie(name) {
    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
  }

  // Método para limpar
  async clear() {
    this.removeCookie(this.COOKIE_NAME);
    console.log('🗑️ Cookie limpo');
  }
}

export const cookieStorage = new CookieStorage();
