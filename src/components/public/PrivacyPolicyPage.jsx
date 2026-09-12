import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { systemConfig } from '../../system-config';

const LAST_UPDATED = '12 de setembro de 2026';

const Section = ({ title, children }) => (
    <section className="mb-8">
        <h2 className="text-xl font-extrabold text-slate-900 mt-2 mb-3">{title}</h2>
        <div className="space-y-3 text-slate-700 leading-relaxed text-base">{children}</div>
    </section>
);

const PrivacyPolicyPage = () => {
    return (
        <div className="font-['Manrope'] antialiased bg-slate-50 min-h-screen">

            {/* Nav */}
            <nav className="bg-white/90 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100 shadow-sm py-4 px-6 flex justify-between items-center">
                <Link to="/" className="flex items-center gap-2 text-slate-600 hover:text-[#166b9c] transition-colors font-medium text-sm">
                    <ArrowLeft size={18} />
                    <span className="hidden md:inline">Voltar ao início</span>
                    <span className="md:hidden">Início</span>
                </Link>

                <Link to="/">
                    <img src="/newlogo2.png" alt="Logo" className="h-8 object-contain" onError={e => e.target.style.display = 'none'} />
                </Link>

                <span className="w-8 md:w-24" />
            </nav>

            {/* Article */}
            <article className="max-w-2xl mx-auto px-4 py-10">
                <div className="flex items-center gap-1.5 text-[#166b9c] text-xs font-bold uppercase tracking-widest mb-4">
                    <ShieldCheck size={14} />
                    Privacidade
                </div>

                <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 leading-tight mb-3">
                    Política de Privacidade
                </h1>
                <p className="text-sm text-slate-400 mb-8 pb-8 border-b border-slate-100">
                    Última atualização: {LAST_UPDATED}
                </p>

                <p className="text-slate-700 leading-relaxed mb-8">
                    Esta Política de Privacidade explica como <strong>{systemConfig.brandName}</strong> coleta,
                    usa, armazena e protege os dados pessoais de quem visita este site ou entra em contato
                    pelos canais divulgados aqui, em conformidade com a Lei Geral de Proteção de Dados
                    (Lei nº 13.709/2018 — LGPD).
                </p>

                <Section title="1. Quem é o controlador dos dados">
                    <p>
                        O controlador dos dados tratados neste site é <strong>{systemConfig.brokerName}</strong>,
                        corretor de imóveis devidamente inscrito no CRECI, atuando sob a marca{' '}
                        <strong>{systemConfig.brandName}</strong>.
                    </p>
                    <p>
                        Dúvidas, solicitações ou reclamações sobre o tratamento de dados podem ser
                        encaminhadas para:
                    </p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>E-mail: <a href={`mailto:${systemConfig.email}`} className="text-[#166b9c] font-medium hover:underline">{systemConfig.email}</a></li>
                        <li>WhatsApp: {systemConfig.phoneDisplay}</li>
                    </ul>
                </Section>

                <Section title="2. Quais dados coletamos">
                    <p>Coletamos apenas os dados necessários para atender quem visita o site ou busca um imóvel:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Dados fornecidos por você</strong>: nome, telefone/WhatsApp, e-mail e qualquer informação enviada ao preencher formulários de contato, solicitar informações sobre um imóvel ou falar com a gente pelo WhatsApp/Telegram.</li>
                        <li><strong>Dados de navegação</strong>: páginas visitadas, imóveis consultados, idioma do navegador e informações técnicas básicas (tipo de dispositivo, origem do acesso), coletadas automaticamente para o funcionamento do site.</li>
                        <li><strong>Preferências</strong>: idioma escolhido e outras preferências salvas localmente no seu navegador, para melhorar sua experiência em visitas futuras.</li>
                    </ul>
                    <p>Não coletamos dados sensíveis (saúde, origem racial, opinião política, religião etc.) nem dados de pagamento — nenhuma transação financeira é processada neste site.</p>
                </Section>

                <Section title="3. Para que usamos seus dados">
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Responder mensagens e dúvidas sobre imóveis anunciados;</li>
                        <li>Entrar em contato sobre imóveis compatíveis com o seu interesse;</li>
                        <li>Elaborar propostas, fichas e documentos relacionados a um atendimento solicitado por você;</li>
                        <li>Melhorar o funcionamento e a experiência de uso do site;</li>
                        <li>Cumprir obrigações legais e regulatórias aplicáveis à atividade de corretagem imobiliária.</li>
                    </ul>
                    <p>
                        A base legal para esse tratamento é, conforme o caso, a <strong>execução de procedimentos
                        preliminares ou de um contrato</strong> a seu pedido, o <strong>legítimo interesse</strong> em
                        responder contatos e divulgar imóveis, ou o <strong>consentimento</strong> que você dá ao
                        preencher um formulário ou iniciar uma conversa pelo WhatsApp/Telegram.
                    </p>
                </Section>

                <Section title="4. Com quem seus dados podem ser compartilhados">
                    <p>Seus dados não são vendidos. Eles podem ser compartilhados apenas com:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Prestadores de infraestrutura</strong> que armazenam e processam os dados em nosso nome (ex.: Supabase, para banco de dados, e Cloudflare, para hospedagem do site), sempre sob obrigação de confidencialidade;</li>
                        <li><strong>WhatsApp e Telegram</strong>, quando você opta por continuar o atendimento por esses canais — nesse caso, o tratamento também segue a política de privacidade do respectivo aplicativo;</li>
                        <li><strong>Parceiros indicados no site</strong> (ex.: despachantes, empresas de financiamento), somente quando você solicitar expressamente uma indicação e autorizar o contato;</li>
                        <li><strong>Autoridades públicas</strong>, quando exigido por lei, ordem judicial ou para exercício regular de direitos.</li>
                    </ul>
                </Section>

                <Section title="5. Cookies e armazenamento local">
                    <p>
                        Usamos armazenamento local do navegador (<em>localStorage</em>) para lembrar preferências
                        como idioma e sessão de acesso administrativo — não para rastrear você em outros sites.
                        Você pode limpar esses dados a qualquer momento nas configurações do seu navegador, sem
                        prejuízo ao uso básico do site.
                    </p>
                </Section>

                <Section title="6. Por quanto tempo guardamos seus dados">
                    <p>
                        Mantemos seus dados pelo tempo necessário para cumprir a finalidade que motivou a coleta
                        (por exemplo, o período de um atendimento ou negociação) ou pelo prazo exigido por
                        obrigações legais e regulatórias da atividade imobiliária. Após esse período, os dados
                        são eliminados ou anonimizados, exceto quando a lei exigir sua conservação.
                    </p>
                </Section>

                <Section title="7. Seus direitos como titular de dados">
                    <p>Conforme o art. 18 da LGPD, você pode solicitar, a qualquer momento:</p>
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Confirmação de que tratamos seus dados e acesso a eles;</li>
                        <li>Correção de dados incompletos, inexatos ou desatualizados;</li>
                        <li>Anonimização, bloqueio ou eliminação de dados desnecessários ou tratados em desconformidade com a lei;</li>
                        <li>Portabilidade dos dados a outro fornecedor de serviço;</li>
                        <li>Eliminação dos dados tratados com o seu consentimento;</li>
                        <li>Informação sobre com quem compartilhamos seus dados;</li>
                        <li>Revogação do consentimento, a qualquer momento;</li>
                        <li>Revisão de decisões automatizadas, quando aplicável.</li>
                    </ul>
                    <p>
                        Para exercer qualquer um desses direitos, entre em contato pelo e-mail ou WhatsApp
                        informados na seção 1. Respondemos dentro de um prazo razoável, conforme a LGPD.
                    </p>
                </Section>

                <Section title="8. Segurança dos dados">
                    <p>
                        Adotamos medidas técnicas e administrativas razoáveis para proteger seus dados contra
                        acessos não autorizados, perda, alteração ou vazamento — incluindo conexão criptografada
                        (HTTPS) e controle de acesso à área administrativa do site. Nenhum sistema é
                        100% livre de riscos; caso identifiquemos um incidente relevante de segurança, você será
                        comunicado conforme exigido pela LGPD.
                    </p>
                </Section>

                <Section title="9. Menores de idade">
                    <p>
                        Este site não se destina a menores de 18 anos e não coletamos intencionalmente dados de
                        crianças ou adolescentes. Caso identifiquemos esse tipo de dado, ele será removido.
                    </p>
                </Section>

                <Section title="10. Alterações desta política">
                    <p>
                        Esta política pode ser atualizada periodicamente, para refletir mudanças legais ou nos
                        serviços oferecidos. A data no topo desta página sempre indica a versão mais recente.
                    </p>
                </Section>

                {/* Back link */}
                <div className="mt-12 pt-8 border-t border-slate-100">
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-[#166b9c] font-bold hover:underline"
                    >
                        <ArrowLeft size={16} />
                        Voltar ao início
                    </Link>
                </div>
            </article>

            {/* Footer */}
            <footer className="bg-slate-800 text-slate-400 text-center py-8 text-sm mt-8">
                <p>© {new Date().getFullYear()} {systemConfig.brokerName} · Todos os direitos reservados</p>
            </footer>
        </div>
    );
};

export default PrivacyPolicyPage;
