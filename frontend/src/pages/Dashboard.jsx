import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import Loading from '../components/Loading'
import './Dashboard.css'

// Função para normalizar dados da prática-chave para espelhar jsonOutput
// Desencapsula dados da API e retorna estrutura consistente
const normalizePratica = (data) => {
  if (!data || typeof data !== 'object') return null

  console.log('🔍 NORMALIZANDO - Dados originais recebidos:', data)
  console.log('🔍 NORMALIZANDO - Chaves disponíveis:', Object.keys(data))

  // Helper para encontrar valor em múltiplas variações de chave (camelCase, snake_case, etc)
  const getField = (obj, ...keys) => {
    if (!obj || typeof obj !== 'object') return undefined
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null) {
        return obj[key]
      }
    }
    return undefined
  }

  // Helper para converter valor para string, extraindo de objetos se necessário
  const getStringField = (obj, ...keys) => {
    const value = getField(obj, ...keys)

    if (typeof value === 'string') return value

    // Se for um objeto, tenta extrair um campo string
    if (value && typeof value === 'object') {
      // Procura por campos comuns que contêm texto
      const stringField = value.titulo || value.title || value.name || value.pratica_chave || value.praticaChave || ''
      if (typeof stringField === 'string') return stringField
      return String(stringField) || ''
    }

    return ''
  }

  // Helper para normalizar arrays de objetos
  const normalizeArray = (arr) => {
    if (!Array.isArray(arr)) return []
    return arr
      .map(item => (item && typeof item === 'object' ? item : null))
      .filter(item => item !== null && item !== undefined)
  }

  // Se os dados estão encapsulados dentro de uma chave pratica_chave, desencapsular
  let sourceData = data
  if (data.pratica_chave && typeof data.pratica_chave === 'object') {
    console.log('🔍 NORMALIZANDO - Detectado pratica_chave aninhado, desencapsulando...')
    console.log('🔍 NORMALIZANDO - Conteúdo de pratica_chave:', data.pratica_chave)
    // Se tem um wrapper com pratica_chave, mesclar o wrapper com o conteúdo
    sourceData = {
      ...data,
      ...data.pratica_chave
    }
  }

  console.log('🔍 NORMALIZANDO - Source data após desencapsulamento:', sourceData)
  console.log('🔍 NORMALIZANDO - Procurando meioacoes em:', ['meioacoes', 'meio_acoes', 'meioAcoes', 'means_actions', 'meios_acoes', 'meio_acao', 'meioacao'])
  const meioacoesEncontrado = getField(sourceData, 'meioacoes', 'meio_acoes', 'meioAcoes', 'means_actions', 'meios_acoes', 'meio_acao', 'meioacao')
  console.log('🔍 NORMALIZANDO - Meioacoes encontrado:', meioacoesEncontrado)

  // Estrutura exata como jsonOutput no criar prática
  const normalized = {
    // Campos para identificação (sidebar + modal)
    id: getField(sourceData, 'id', '_id') || Date.now(),
    titulo: getStringField(sourceData, 'titulo', 'title', 'praticaChave', 'pratica_chave') || 'Sem título',
    icone: getStringField(sourceData, 'icone', 'icon') || '🎯',
    status: getStringField(sourceData, 'status') || 'ativo',

    // Estrutura exata do jsonOutput
    praticaChave: getStringField(sourceData, 'praticaChave', 'pratica_chave', 'titulo', 'title') || '',
    objetivos: getStringField(sourceData, 'objetivos', 'objectives', 'objetivo', 'goals') || '',
    publicoAlvo: getStringField(sourceData, 'publicoAlvo', 'publico_alvo', 'publicAlvo', 'target_audience', 'audience') || '',
    aprendizado: getStringField(sourceData, 'aprendizado', 'aprendizados', 'learning', 'lessons') || '',

    // Arrays com mesma estrutura esperada
    meioacoes: normalizeArray(
      getField(sourceData, 'meioacoes', 'meio_acoes', 'meioAcoes', 'means_actions', 'meios_acoes', 'meio_acao', 'meioacao')
    ),
    periodicidade: normalizeArray(
      getField(sourceData, 'periodicidade', 'periodicidades', 'periodicity', 'frequencia', 'frequencias')
    ),
    procedimentos: normalizeArray(
      getField(sourceData, 'procedimentos', 'procedures', 'plano_atividades', 'planoAtividades', 'activities')
    ),
    metricas: normalizeArray(
      getField(sourceData, 'metricas', 'metrics', 'métricas', 'indicadores', 'indicators')
    ),
    evidencias: normalizeArray(
      getField(sourceData, 'evidencias', 'evidências', 'evidence', 'proofs', 'documents')
    )
  }

  console.log(`📦 Prática normalizada: ${normalized.titulo}`)
  console.log('📋 Estrutura:', {
    praticaChave: normalized.praticaChave,
    objetivos: normalized.objetivos ? '✓' : '✗',
    meioacoes: normalized.meioacoes.length,
    publicoAlvo: normalized.publicoAlvo ? '✓' : '✗',
    periodicidade: normalized.periodicidade.length,
    procedimentos: normalized.procedimentos.length,
    metricas: normalized.metricas.length,
    aprendizado: normalized.aprendizado ? '✓' : '✗',
    evidencias: normalized.evidencias.length
  })

  return normalized
}

// ── Agenda helpers ──────────────────────────────────────────────────────────

function getDaysInRange(startDate, endDate) {
  const days = []
  const cur = new Date(startDate + 'T00:00:00')
  const end = new Date(endDate + 'T00:00:00')
  while (cur <= end) {
    days.push(cur.toISOString().split('T')[0])
    cur.setDate(cur.getDate() + 1)
  }
  return days
}

function getBookedIntervals(reservas, data) {
  return (reservas || [])
    .filter(r => r.data === data)
    .map(r => ({ start: parseInt(r.horaInicio), end: parseInt(r.horaFim) }))
}

function getAvailableStartHours(slotStart, slotEnd, bookedIntervals, duracao) {
  const available = []
  for (let h = parseInt(slotStart); h + duracao <= parseInt(slotEnd); h++) {
    if (!bookedIntervals.some(b => h < b.end && h + duracao > b.start)) {
      available.push(h)
    }
  }
  return available
}

function getMaxDuracao(slotEnd, startHour, bookedIntervals) {
  let max = 0
  for (let dur = 1; startHour + dur <= parseInt(slotEnd); dur++) {
    if (bookedIntervals.some(b => startHour < b.end && startHour + dur > b.start)) break
    max = dur
  }
  return max
}

function getBookedHoursForDay(reservas, data) {
  return (reservas || [])
    .filter(r => r.data === data)
    .reduce((sum, r) => sum + parseInt(r.horaFim) - parseInt(r.horaInicio), 0)
}

// ────────────────────────────────────────────────────────────────────────────

function Dashboard() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuth()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [currentSection, setCurrentSection] = useState(() => {
    // Load from localStorage if available
    return localStorage.getItem('dashboardSection') || 'overview'
  })
  const [submenuOpen, setSubmenuOpen] = useState(false)
  const [currentSubmenu, setCurrentSubmenu] = useState('gerenciar')
  const [atividadesSubmenuOpen, setAtividadesSubmenuOpen] = useState(false)
  const [currentAtividadesSubmenu, setCurrentAtividadesSubmenu] = useState('praticas-chaves')
  const [showNovaParticaModal, setShowNovaParticaModal] = useState(false)
  const [showProcedimentoModal, setShowProcedimentoModal] = useState(false)
  const [showMeioAcaoModal, setShowMeioAcaoModal] = useState(false)
  const [showPeriodicidadeModal, setShowPeriodicidadeModal] = useState(false)
  const [showNovaMetricaModal, setShowNovaMetricaModal] = useState(false)
  const [selectedPratica, setSelectedPratica] = useState(null)
  const [selectedPraticaId, setSelectedPraticaId] = useState(null)
  const [novaParticaForm, setNovaParticaForm] = useState({
    praticaChave: '',
    objetivos: '',
    meioacoes: [],
    publicoAlvo: '',
    periodicidade: [],
    procedimentos: [],
    metricas: [],
    aprendizado: '',
    evidencias: []
  })
  const [novaMeioacao, setNovaMeioacao] = useState({
    meio: '',
    acao: ''
  })
  const [novaPeriodicidade, setNovaPeriodicidade] = useState({
    meioacaoId: '',
    periodicidade: ''
  })
  const [novaProcedimento, setNovaProcedimento] = useState({
    meioacaoId: '',
    atividades: '',
    responsavel: '',
    quando: ''
  })
  const [novaMetrica, setNovaMetrica] = useState({
    titulo: '',
    descricao: ''
  })
  const [novaEvidencia, setNovaEvidencia] = useState({
    nome: '',
    arquivo: null
  })
  const [isIncubado, setIsIncubado] = useState(true)
  const [isConsultor, setIsConsultor] = useState(false)
  const [questionariosConsultor, setQuestionariosConsultor] = useState([])
  const [showQuestionariosConsultor, setShowQuestionariosConsultor] = useState(false)
  const [loadingQuestionariosConsultor, setLoadingQuestionariosConsultor] = useState(false)
  const [loadingApproval, setLoadingApproval] = useState(true)
  const [pendingPlans, setPendingPlans] = useState([])
  const [loadingPendingPlans, setLoadingPendingPlans] = useState(false)
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth())
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [selectedDate, setSelectedDate] = useState(null)
  const [selectedDateRangeStart, setSelectedDateRangeStart] = useState(null)
  const [selectedDateRangeEnd, setSelectedDateRangeEnd] = useState(null)
  const [showAppointmentModal, setShowAppointmentModal] = useState(false)
  const [showMessageModal, setShowMessageModal] = useState(false)
  const [messageModalType, setMessageModalType] = useState('error') // 'error' ou 'success'
  const [messageModalContent, setMessageModalContent] = useState('')
  const [appointments, setAppointments] = useState([])
  const [appointmentForm, setAppointmentForm] = useState({
    title: '',
    description: '',
    responsible: '',
    startHour: '09',
    endHour: '10',
    isOpenAppointment: false
  })
  const [selectedAppointmentForConfirmation, setSelectedAppointmentForConfirmation] = useState(null)
  const [showConfirmationModal, setShowConfirmationModal] = useState(false)
  const [confirmationLoading, setConfirmationLoading] = useState(false)
  const [agendaOriginalData, setAgendaOriginalData] = useState({})  // Armazena JSON original das agendas
  const [hasChanges, setHasChanges] = useState(false)  // Rastreia se há modificações na agenda
  const [reservacaoForm, setReservacaoForm] = useState({ data: '', horaInicio: '09', duracao: 1 })
  const [editingAppointment, setEditingAppointment] = useState(null)
  const [editingReservas, setEditingReservas] = useState([])
  const [horarioMode, setHorarioMode] = useState('same') // 'same' | 'different'
  const [horariosPerDia, setHorariosPerDia] = useState([])
  const [editDayMode, setEditDayMode] = useState(false)
  const [editDaysPerDia, setEditDaysPerDia] = useState([])
  const [stats, setStats] = useState({
    totalUsers: 1250,
    pendingReviews: 23,
    completedForms: 824
  })
  const [praticasChaves, setPraticasChaves] = useState([])
  const [loadingPraticas, setLoadingPraticas] = useState(false)
  const [errorPraticas, setErrorPraticas] = useState(null)
  const [showNovoEventoModal, setShowNovoEventoModal] = useState(false)
  const [eventoPraticasChaves, setEventoPraticasChaves] = useState([])
  const [loadingEventoPraticas, setLoadingEventoPraticas] = useState(false)
  const [novoEvento, setNovoEvento] = useState({
    praticaChaveId: '',
    titulo: '',
    descricao: '',
    objetivos: '',
    publicoAlvo: '',
    periodicidade: '',
    aprendizado: '',
    meioacoes: {}, // { meioacaoId: valor }
    metricas: {}, // { metricaId: valor }
    evidencias: [] // array de arquivos
  })
  const [showEventoJsonModal, setShowEventoJsonModal] = useState(false)
  const [eventoJsonOutput, setEventoJsonOutput] = useState(null)

  useEffect(() => {
    // Save current section to localStorage whenever it changes
    localStorage.setItem('dashboardSection', currentSection)
  }, [currentSection])

  useEffect(() => {
    // Log quando appointments mudar
    console.log('📊 Estado de appointments atualizado:', appointments.length, 'compromissos')
    console.log('📊 Detalhes:', appointments)
  }, [appointments])

  useEffect(() => {
    // Check if we should navigate to aprovar section
    if (location.state?.scrollToAprovar) {
      setCurrentSection('aprovar')
      // Clear the state
      window.history.replaceState({}, document.title)
    }
  }, [location])

  useEffect(() => {
    const checkUserStatus = async () => {
      try {
        const response = await api.get('/users/me')
        console.log('📝 Dashboard user data:', response.data)

        const isConsultorValue = response.data?.is_consultant === true
        const isIncubadoValue = !isConsultorValue && response.data?.is_incubated === true

        console.log('👨‍💼 is_consultant:', isConsultorValue)
        console.log('🏢 is_incubated:', isIncubadoValue)

        setIsConsultor(isConsultorValue)
        setIsIncubado(isIncubadoValue)
      } catch (err) {
        console.error('Error checking user status:', err)
        setIsIncubado(false)
        setIsConsultor(false)
      } finally {
        setLoadingApproval(false)
      }
    }

    checkUserStatus()
  }, [])

  useEffect(() => {
    if (currentAtividadesSubmenu === 'praticas-chaves') {
      const fetchPraticas = async () => {
        setLoadingPraticas(true)
        setErrorPraticas(null)
        try {
          const response = await api.get('/pratica-chave')

          console.log('🔍 API Response:', response.data)
          console.log('🔍 Is Array:', Array.isArray(response.data))
          if (Array.isArray(response.data) && response.data.length > 0) {
            console.log('🔍 First item:', response.data[0])
            console.log('🔍 First item keys:', Object.keys(response.data[0]))
          }

          let praticas = []

          // Extrair array de práticas da resposta (múltiplos formatos possíveis)
          if (Array.isArray(response.data)) {
            praticas = response.data
          } else if (response.data && Array.isArray(response.data.praticas)) {
            praticas = response.data.praticas
          } else if (response.data && response.data.pratica_chave) {
            praticas = [response.data]
          } else if (response.data && typeof response.data === 'object') {
            praticas = [response.data]
          }

          // Normalizar todos os dados usando a função normalizadora
          praticas = praticas
            .map((item) => {
              // Se item tem campo pratica_chave, mesclar com dados do wrapper
              if (item && item.pratica_chave && typeof item.pratica_chave === 'object') {
                return normalizePratica({
                  id: item.id,
                  titulo: item.titulo,
                  icone: item.icone,
                  status: item.status,
                  ...item.pratica_chave
                })
              }
              return normalizePratica(item)
            })
            .filter(p => p !== null)

          console.log('📊 Práticas após extração:', praticas)
          if (praticas.length > 0) {
            console.log('📊 Primeira prática após extração:', praticas[0])
            console.log('📊 Chaves da primeira prática:', Object.keys(praticas[0]))
          }

          setPraticasChaves(praticas)
        } catch (err) {
          console.error('Erro ao carregar práticas chaves:', err)
          setErrorPraticas(err.message || 'Erro ao carregar práticas chaves')
          setPraticasChaves([])
        } finally {
          setLoadingPraticas(false)
        }
      }

      fetchPraticas()
    }
  }, [currentAtividadesSubmenu])

  useEffect(() => {
    if (currentSection === 'gerenciar-projetos' && isConsultor) {
      const fetchPlans = async () => {
        setLoadingPendingPlans(true)
        try {
          let endpoint = '/plano/aprovar'

          if (currentSubmenu === 'aprovados') {
            endpoint = '/plano/aprovados'
          } else if (currentSubmenu === 'rejeitados') {
            endpoint = '/plano/rejeitados'
          }

          const response = await api.get(endpoint)
          console.log('📋 Planos - Full response:', response)
          console.log('📋 Planos - response.data:', response.data)
          console.log('📋 Planos - type:', typeof response.data)
          console.log('📋 Planos - is array:', Array.isArray(response.data))
          if (Array.isArray(response.data) && response.data.length > 0) {
            console.log('📋 Primeiro item:', JSON.stringify(response.data[0], null, 2))
            console.log('📋 Todas as IDs dos planos:', response.data.map((p, idx) => ({ index: idx, id: p.id, empresa: p.questionario?.formData?.nomeNegocio })))
          }
          setPendingPlans(Array.isArray(response.data) ? response.data : [response.data])
        } catch (err) {
          console.error('Erro ao carregar planos:', err)
          setPendingPlans([])
        } finally {
          setLoadingPendingPlans(false)
        }
      }

      // Fetch immediately
      fetchPlans()

      // Set up interval to refresh every 5 minutes (300000 ms)
      const intervalId = setInterval(fetchPlans, 300000)

      // Clean up interval when component unmounts or section changes
      return () => clearInterval(intervalId)
    }
  }, [currentSection, currentSubmenu, isConsultor])

  useEffect(() => {
    if (currentSection === 'agenda') {
      const fetchAgenda = async () => {
        try {
          console.log('📅 Carregando agenda do servidor...')
          const response = await api.get('/agenda/visualizacao')
          console.log('📅 Resposta da API:', response.data)

          // Processar os registros retornados
          let loadedAppointments = []
          let agendaDataMap = {}

          if (Array.isArray(response.data)) {
            console.log('📅 Resposta é um array com', response.data.length, 'elementos')
            // Iterar sobre cada registro do array
            response.data.forEach((record, idx) => {
              // Acessar agenda_json.agenda_json.compromissos
              const agendaJsonData = record?.agenda_json?.agenda_json || {}
              const compromissos = agendaJsonData?.compromissos || []
              const agendaId = record?.id  // ID da agenda

              // Armazenar dados originais da agenda para usar ao participar
              agendaDataMap[agendaId] = agendaJsonData

              console.log(`📅 Registro ${idx} com ID ${agendaId} tem ${compromissos.length} compromissos`)

              // Processar cada compromisso
              compromissos.forEach((apt, aptIdx) => {
                console.log(`📅 Processando compromisso ${aptIdx}:`, apt)

                // Transformar o compromisso do formato API para o formato interno
                const reservas = apt.reservas || []
                const transformedAppointment = {
                  id: apt.id,
                  agendaId: agendaId,
                  title: apt.titulo,
                  description: apt.descricao || '',
                  responsible: apt.responsavel || '',
                  startDate: apt.dataInicio,
                  endDate: apt.dataFim,
                  startHour: apt.horaInicio ? apt.horaInicio.split(':')[0] : '00',
                  endHour: apt.horaFim ? apt.horaFim.split(':')[0] : '00',
                  isOpenAppointment: apt.ehCompromisoAberto || false,
                  consultorEmail: apt.consultorEmail,
                  reservas,
                }

                loadedAppointments.push(transformedAppointment)
              })
            })
          } else {
            console.log('⚠️ Resposta não é um array:', response.data)
          }

          console.log('📅 Total de compromissos carregados:', loadedAppointments.length)
          console.log('📅 Compromissos processados:', loadedAppointments)
          setAppointments(loadedAppointments)
          setAgendaOriginalData(agendaDataMap)
        } catch (err) {
          console.error('❌ Erro ao carregar agenda:', err)
          console.error('❌ Detalhes do erro:', err.message, err.response?.data)
          setAppointments([])
        }
      }

      fetchAgenda()
    }
  }, [currentSection, currentMonth, currentYear])

  const handleLogout = () => {
    logout()
  }

  const gerarHTMLQuestionario = (raw) => {
    const rel = raw.planejamento_mercado_rel || {}
    const d = {
      nomeProponente: raw.nome_proponente || '',
      nomeNegocio: raw.nome_negocio || '',
      setorAtuacao: raw.setor_atuacao || '',
      cnpj: raw.cnpj || '',
      businessModelCanvas: raw.business_canvas || '',
      executiveSummary: raw.sumario_executivo || '',
      produtoServico: raw.planejamento_produto || raw.produto_servico || '',
      analiseFornecedores: rel.fornecedores || raw.fornecedores || raw.analise_fornecedores || '',
      analiseCompetidores: rel.concorrentes || raw.concorrentes || raw.analise_competidores || '',
      planejamentoMercado: rel.analise_acao || raw.analise_acao || '',
      estrategiaMarketing: raw.planejamento_marketing || raw.estrategia_marketing || '',
      planejamentoEstrutura: raw.planejamento_estrutura || '',
      planejamentoFinanceiro: raw.planejamento_financeiro || '',
    }
    console.log('📄 Gerando HTML com dados:', d)

    const dataGeracao = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
    const nomeArquivo = (d.nomeNegocio || d.nomeProponente || 'questionario').replace(/\s+/g, '-').toLowerCase()

    const secao = (numero, titulo, conteudo) => `
      <div class="secao">
        <div class="secao-titulo">
          <span class="secao-numero">${numero}</span>
          <span class="secao-label">${titulo}</span>
        </div>
        <div class="secao-corpo">${conteudo ? conteudo.replace(/\n/g, '<br/>') : '<span class="vazio">Não preenchido</span>'}</div>
      </div>`

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Relatório de Questionário — ${d.nomeNegocio || d.nomeProponente}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');

    @page {
      size: A4;
      margin: 0;
    }

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', Arial, sans-serif;
      font-size: 11px;
      color: #1a1a2e;
      background: #e8ecf4;
      padding: 24px;
    }

    .pagina {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #fff;
      overflow: hidden;
      box-shadow: 0 4px 32px rgba(0,0,0,0.15);
    }

    /* ── Cabeçalho ── */
    .cabecalho {
      background: linear-gradient(135deg, #0f2d6e 0%, #1a4b8c 60%, #2563c4 100%);
      padding: 28px 36px 24px;
      color: #fff;
      position: relative;
    }
    .cabecalho::after {
      content: '';
      display: block;
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: 5px;
      background: linear-gradient(90deg, #f59e0b, #ef4444, #8b5cf6);
    }
    .cabecalho-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 18px;
    }
    .badge-relatorio {
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.3);
      color: #fff;
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      padding: 3px 10px;
      border-radius: 20px;
    }
    .data-geracao {
      font-size: 10px;
      color: rgba(255,255,255,0.65);
    }
    .cabecalho h1 {
      font-size: 22px;
      font-weight: 700;
      margin-bottom: 4px;
      letter-spacing: -0.3px;
    }
    .cabecalho .subtitulo {
      font-size: 11px;
      color: rgba(255,255,255,0.7);
      font-weight: 300;
    }

    /* ── Faixa de metadados ── */
    .meta-faixa {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      background: #f8faff;
      border-bottom: 2px solid #e2e8f0;
    }
    .meta-item {
      padding: 12px 20px;
      border-right: 1px solid #e2e8f0;
    }
    .meta-item:last-child { border-right: none; }
    .meta-rotulo {
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 1px;
      text-transform: uppercase;
      color: #94a3b8;
      margin-bottom: 3px;
    }
    .meta-valor {
      font-size: 11px;
      font-weight: 600;
      color: #1e293b;
    }

    /* ── Conteúdo ── */
    .conteudo { padding: 20px 36px 36px; }

    .secao {
      margin-bottom: 14px;
      border: 1px solid #e8edf5;
      border-radius: 6px;
      overflow: hidden;
      page-break-inside: avoid;
      break-inside: avoid;
    }

    .secao-titulo {
      display: flex;
      align-items: center;
      gap: 10px;
      background: #f1f5fd;
      padding: 8px 14px;
      border-bottom: 1px solid #dde4f0;
    }
    .secao-numero {
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 22px;
      height: 22px;
      background: #1a4b8c;
      color: #fff;
      font-size: 10px;
      font-weight: 700;
      border-radius: 50%;
      flex-shrink: 0;
      padding: 0 3px;
    }
    .secao-label {
      font-size: 11px;
      font-weight: 600;
      color: #1e293b;
    }

    .secao-corpo {
      padding: 12px 14px;
      line-height: 1.65;
      color: #374151;
      white-space: pre-wrap;
      font-size: 11px;
    }
    .vazio {
      color: #9ca3af;
      font-style: italic;
    }

    /* ── Rodapé ── */
    .rodape {
      margin-top: 20px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 9px;
      color: #94a3b8;
    }

    /* ── Barra de ações ── */
    .acoes-bar {
      display: flex;
      justify-content: center;
      gap: 12px;
      padding: 16px 0 24px;
    }
    .btn-acao {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 24px;
      border: none;
      border-radius: 8px;
      font-family: 'Inter', Arial, sans-serif;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .btn-acao:hover { opacity: 0.85; }
    .btn-imprimir { background: #1a4b8c; color: #fff; }
    .btn-download { background: #f1f5fd; color: #1a4b8c; border: 1px solid #dde4f0; }

    /* ── Print ── */
    @media print {
      .acoes-bar { display: none; }
      body { background: #fff; padding: 3cm; }
      .pagina { box-shadow: none; width: 100%; min-height: 0; }
      .secao { page-break-inside: avoid; }
      .cabecalho { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .secao-titulo { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .secao-numero { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .meta-faixa { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="acoes-bar">
    <button class="btn-acao btn-imprimir" onclick="window.print()">🖨️ Imprimir</button>
    <button class="btn-acao btn-download" onclick="downloadHTML()">⬇️ Baixar PDF</button>
  </div>
  <div class="pagina">

    <div class="cabecalho">
      <div class="cabecalho-top">
        <span class="badge-relatorio">Relatório Oficial</span>
        <span class="data-geracao">Gerado em ${dataGeracao}</span>
      </div>
      <h1>${d.nomeNegocio || 'Nome do Negócio'}</h1>
      <p class="subtitulo">Plano de Negócio — Questionário de Incubação</p>
    </div>

    <div class="meta-faixa">
      <div class="meta-item">
        <div class="meta-rotulo">Proponente</div>
        <div class="meta-valor">${d.nomeProponente || '—'}</div>
      </div>
      <div class="meta-item">
        <div class="meta-rotulo">CNPJ</div>
        <div class="meta-valor">${d.cnpj || '—'}</div>
      </div>
      <div class="meta-item">
        <div class="meta-rotulo">Setor de Atuação</div>
        <div class="meta-valor">${d.setorAtuacao || '—'}</div>
      </div>
    </div>

    <div class="conteudo">
      ${secao(1, 'Setor de Atuação', d.setorAtuacao)}
      ${secao(2, 'Business Model Canvas', d.businessModelCanvas)}
      ${secao(3, 'Sumário Executivo', d.executiveSummary)}
      ${secao(5, 'Planejamento do Produto e/ou Serviço', d.produtoServico)}
      ${secao('6a', 'Análise dos Fornecedores', d.analiseFornecedores)}
      ${secao('6b', 'Análise dos Concorrentes', d.analiseCompetidores)}
      ${secao('6c', 'Planejamento das Ações do Mercado', d.planejamentoMercado)}
      ${secao(7, 'Estratégia de Marketing', d.estrategiaMarketing)}
      ${secao(8, 'Planejamento da Estrutura, Gerência e Operações', d.planejamentoEstrutura)}
      ${secao(9, 'Planejamento Financeiro', d.planejamentoFinanceiro)}

      <div class="rodape">
        <span>TecIncubadora — Documento gerado automaticamente</span>
        <span>${dataGeracao}</span>
      </div>
    </div>

  </div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
  <script>
    async function downloadHTML() {
      const btn = document.querySelector('.btn-download');
      btn.textContent = '⏳ Gerando...';
      btn.disabled = true;
      try {
        const pagina = document.querySelector('.pagina');
        await html2pdf().set({
          margin: 15,
          filename: 'relatorio-${nomeArquivo}.pdf',
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'], avoid: ['.secao'] }
        }).from(pagina).save();
      } finally {
        btn.textContent = '⬇️ Baixar PDF';
        btn.disabled = false;
      }
    }
  </script>
</body>
</html>`
  }

  const abrirRelatorioQuestionario = (raw) => {
    const html = gerarHTMLQuestionario(raw)
    const win = window.open('', '_blank')
    win.document.write(html)
    win.document.close()
    win.focus()
  }

  const buscarEAbrirQuestionario = async (raw) => {
    let rawEnriquecido = { ...raw }
    console.log('📥 Dados do questionário recebidos:', raw)

    const planejamentoId = raw.planejamento_mercado
    console.log('🔎 planejamento_mercado ID:', planejamentoId)

    if (planejamentoId) {
      try {
        const resp = await api.get(`/planejamento/${planejamentoId}`)
        const p = resp.data || {}
        console.log('📦 Dados do planejamento:', p)
        rawEnriquecido.planejamento_mercado_rel = {
          fornecedores: p.fornecedores || '',
          concorrentes: p.concorrentes || '',
          analise_acao: p.analise_acao || '',
          upload_file_path: p.upload_file_path || '',
        }
      } catch (err) {
        console.warn('⚠️ Não foi possível buscar planejamento de mercado:', err)
      }
    } else {
      console.warn('⚠️ Sem planejamento_mercado ID no questionário — campos de mercado podem estar vazios')
    }
    abrirRelatorioQuestionario(rawEnriquecido)
  }

  const handleGerarPDFQuestionario = async () => {
    try {
      const response = await api.get('/questionario')
      const raw = Array.isArray(response.data) ? response.data[0] : response.data
      if (!raw) return alert('Nenhum questionário encontrado.')
      await buscarEAbrirQuestionario(raw)
    } catch (err) {
      console.error('❌ Erro ao gerar PDF:', err)
    }
  }

  const handleVerQuestionarioConsultor = async (q) => {
    await buscarEAbrirQuestionario(q)
  }

  const handleAbrirQuestionariosConsultor = async () => {
    setShowQuestionariosConsultor(true)
    setLoadingQuestionariosConsultor(true)
    try {
      const response = await api.get('/questionario/consultant')
      const lista = Array.isArray(response.data) ? response.data : []
      const ordenada = [...lista].sort((a, b) =>
        (a.nome_negocio || '').localeCompare(b.nome_negocio || '', 'pt-BR', { sensitivity: 'base' })
      )
      setQuestionariosConsultor(ordenada)
    } catch (err) {
      console.error('❌ Erro ao buscar questionários:', err)
      setQuestionariosConsultor([])
    } finally {
      setLoadingQuestionariosConsultor(false)
    }
  }

  const handleGerarPDFMembros = async () => {
    try {
      const qResponse = await api.get('/questionario')
      const raw = Array.isArray(qResponse.data) ? qResponse.data[0] : qResponse.data
      if (!raw) return alert('Nenhum questionário encontrado.')

      const equipeId = raw.equipe
      if (!equipeId) return alert('Nenhuma equipe cadastrada.')

      const mResponse = await api.get(`/membros/${equipeId}`)
      const membros = Array.isArray(mResponse.data) ? mResponse.data : []

      const dataGeracao = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

      const linhasMembros = membros.length === 0
        ? `<tr><td colspan="4" style="text-align:center;color:#9ca3af;font-style:italic;padding:20px;">Nenhum membro cadastrado</td></tr>`
        : membros.map((m, i) => `
          <tr class="${i % 2 === 0 ? 'par' : 'impar'}">
            <td>${m.nome || '—'}</td>
            <td>${m.email || '—'}</td>
            <td>${m.formacao_academica || '—'}</td>
            <td>${m.experiencia || '—'}</td>
          </tr>`).join('')

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8"/>
  <title>Relatório de Membros — ${raw.nome_negocio || raw.nome_proponente}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
    @page { size: A4; margin: 0; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: 'Inter', Arial, sans-serif;
      font-size: 11px;
      color: #1a1a2e;
      background: #e8ecf4;
      padding: 24px;
    }

    .pagina {
      width: 210mm;
      min-height: 297mm;
      margin: 0 auto;
      background: #fff;
      box-shadow: 0 4px 32px rgba(0,0,0,0.15);
    }

    .cabecalho {
      background: linear-gradient(135deg, #0f2d6e 0%, #1a4b8c 60%, #2563c4 100%);
      padding: 28px 36px 24px;
      color: #fff;
      position: relative;
    }
    .cabecalho::after {
      content: '';
      position: absolute;
      bottom: 0; left: 0; right: 0;
      height: 5px;
      background: linear-gradient(90deg, #f59e0b, #ef4444, #8b5cf6);
    }
    .cabecalho-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 18px;
    }
    .badge {
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.3);
      color: #fff;
      font-size: 9px;
      font-weight: 600;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      padding: 3px 10px;
      border-radius: 20px;
    }
    .data-geracao { font-size: 10px; color: rgba(255,255,255,0.65); }
    .cabecalho h1 { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
    .cabecalho .subtitulo { font-size: 11px; color: rgba(255,255,255,0.7); font-weight: 300; }

    .meta-faixa {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      background: #f8faff;
      border-bottom: 2px solid #e2e8f0;
    }
    .meta-item { padding: 12px 20px; border-right: 1px solid #e2e8f0; }
    .meta-item:last-child { border-right: none; }
    .meta-rotulo { font-size: 9px; font-weight: 600; letter-spacing: 1px; text-transform: uppercase; color: #94a3b8; margin-bottom: 3px; }
    .meta-valor { font-size: 11px; font-weight: 600; color: #1e293b; }

    .conteudo { padding: 24px 36px 36px; }

    .total-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #f1f5fd;
      border: 1px solid #dde4f0;
      border-radius: 20px;
      padding: 4px 14px;
      font-size: 10px;
      font-weight: 600;
      color: #1a4b8c;
      margin-bottom: 16px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      border-radius: 8px;
      overflow: hidden;
      border: 1px solid #e2e8f0;
      page-break-inside: auto;
      break-inside: auto;
    }
    tr { page-break-inside: avoid; break-inside: avoid; }
    thead tr {
      background: #1a4b8c;
      color: #fff;
    }
    thead th {
      padding: 10px 14px;
      text-align: left;
      font-size: 10px;
      font-weight: 600;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    tbody td {
      padding: 10px 14px;
      font-size: 11px;
      color: #374151;
      border-bottom: 1px solid #f0f4f8;
      vertical-align: top;
    }
    tr.par { background: #fff; }
    tr.impar { background: #f8faff; }

    .rodape {
      margin-top: 24px;
      padding-top: 12px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      font-size: 9px;
      color: #94a3b8;
    }

    /* ── Barra de ações ── */
    .acoes-bar {
      display: flex;
      justify-content: center;
      gap: 12px;
      padding: 16px 0 24px;
    }
    .btn-acao {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 10px 24px;
      border: none;
      border-radius: 8px;
      font-family: 'Inter', Arial, sans-serif;
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .btn-acao:hover { opacity: 0.85; }
    .btn-imprimir { background: #1a4b8c; color: #fff; }
    .btn-download { background: #f1f5fd; color: #1a4b8c; border: 1px solid #dde4f0; }

    @media print {
      .acoes-bar { display: none; }
      body { background: #fff; padding: 3cm; }
      .pagina { box-shadow: none; width: 100%; min-height: 0; }
      .cabecalho { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      thead tr { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      tr.impar { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
      .meta-faixa { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    }
  </style>
</head>
<body>
  <div class="acoes-bar">
    <button class="btn-acao btn-imprimir" onclick="window.print()">🖨️ Imprimir</button>
    <button class="btn-acao btn-download" onclick="downloadHTML()">⬇️ Baixar PDF</button>
  </div>
  <div class="pagina">
    <div class="cabecalho">
      <div class="cabecalho-top">
        <span class="badge">Relatório de Equipe</span>
        <span class="data-geracao">Gerado em ${dataGeracao}</span>
      </div>
      <h1>${raw.nome_negocio || 'Nome do Negócio'}</h1>
      <p class="subtitulo">Membros da Equipe — Plano de Negócio</p>
    </div>

    <div class="meta-faixa">
      <div class="meta-item">
        <div class="meta-rotulo">Proponente</div>
        <div class="meta-valor">${raw.nome_proponente || '—'}</div>
      </div>
      <div class="meta-item">
        <div class="meta-rotulo">Setor de Atuação</div>
        <div class="meta-valor">${raw.setor_atuacao || '—'}</div>
      </div>
    </div>

    <div class="conteudo">
      <div class="total-badge">👥 ${membros.length} membro${membros.length !== 1 ? 's' : ''} cadastrado${membros.length !== 1 ? 's' : ''}</div>
      <table>
        <thead>
          <tr>
            <th>Nome</th>
            <th>E-mail</th>
            <th>Formação Acadêmica</th>
            <th>Experiência</th>
          </tr>
        </thead>
        <tbody>
          ${linhasMembros}
        </tbody>
      </table>

      <div class="rodape">
        <span>TecIncubadora — Documento gerado automaticamente</span>
        <span>${dataGeracao}</span>
      </div>
    </div>
  </div>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
  <script>
    async function downloadHTML() {
      const btn = document.querySelector('.btn-download');
      btn.textContent = '⏳ Gerando...';
      btn.disabled = true;
      try {
        const pagina = document.querySelector('.pagina');
        await html2pdf().set({
          margin: 15,
          filename: 'relatorio-membros.pdf',
          image: { type: 'jpeg', quality: 0.95 },
          html2canvas: { scale: 2, useCORS: true },
          jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
          pagebreak: { mode: ['css', 'legacy'], avoid: ['tr'] }
        }).from(pagina).save();
      } finally {
        btn.textContent = '⬇️ Baixar PDF';
        btn.disabled = false;
      }
    }
  </script>
</body>
</html>`

      const win = window.open('', '_blank')
      win.document.write(html)
      win.document.close()
      win.focus()
    } catch (err) {
      console.error('❌ Erro ao gerar PDF de membros:', err)
    }
  }

  const handleAddMeioacoes = () => {
    if (!novaMeioacao.meio.trim() || !novaMeioacao.acao.trim()) {
      alert('Por favor, preencha os campos Meio e Ação')
      return
    }
    setNovaParticaForm({
      ...novaParticaForm,
      meioacoes: [...novaParticaForm.meioacoes, { id: Date.now(), meio: novaMeioacao.meio, acao: novaMeioacao.acao }]
    })
    setNovaMeioacao({
      meio: '',
      acao: ''
    })
  }

  const handleRemoveMeioacoes = (id) => {
    setNovaParticaForm({
      ...novaParticaForm,
      meioacoes: novaParticaForm.meioacoes.filter(m => m.id !== id)
    })
  }

  const handleAddPeriodicidade = () => {
    if (!novaPeriodicidade.meioacaoId || !novaPeriodicidade.periodicidade.trim()) {
      alert('Por favor, selecione um Meio/Ação e preencha a Periodicidade')
      return
    }

    const meioacaoSelecionado = novaParticaForm.meioacoes.find(m => m.id == novaPeriodicidade.meioacaoId)

    setNovaParticaForm({
      ...novaParticaForm,
      periodicidade: [...novaParticaForm.periodicidade, {
        id: Date.now(),
        meioacaoId: novaPeriodicidade.meioacaoId,
        meioacao: meioacaoSelecionado,
        texto: novaPeriodicidade.periodicidade
      }]
    })
    setNovaPeriodicidade({
      meioacaoId: '',
      periodicidade: ''
    })
  }

  const handleRemovePeriodicidade = (id) => {
    setNovaParticaForm({
      ...novaParticaForm,
      periodicidade: novaParticaForm.periodicidade.filter(p => p.id !== id)
    })
  }

  const handleAddProcedimento = () => {
    if (!novaProcedimento.meioacaoId || !novaProcedimento.atividades.trim()) {
      alert('Por favor, selecione um Meio/Ação e preencha as Atividades')
      return
    }

    const meioacaoSelecionado = novaParticaForm.meioacoes.find(m => m.id == novaProcedimento.meioacaoId)

    setNovaParticaForm({
      ...novaParticaForm,
      procedimentos: [...novaParticaForm.procedimentos, {
        id: Date.now(),
        meioacaoId: novaProcedimento.meioacaoId,
        meioacao: meioacaoSelecionado,
        atividades: novaProcedimento.atividades,
        responsavel: novaProcedimento.responsavel,
        quando: novaProcedimento.quando
      }]
    })

    setNovaProcedimento({
      meioacaoId: '',
      atividades: '',
      responsavel: '',
      quando: ''
    })
    setShowProcedimentoModal(false)
  }

  const handleRemoveProcedimento = (id) => {
    setNovaParticaForm({
      ...novaParticaForm,
      procedimentos: novaParticaForm.procedimentos.filter(p => p.id !== id)
    })
  }

  const handleAddMetrica = () => {
    if (!novaMetrica.titulo.trim() || !novaMetrica.descricao.trim()) return
    setNovaParticaForm({
      ...novaParticaForm,
      metricas: [...novaParticaForm.metricas, { id: Date.now(), titulo: novaMetrica.titulo, descricao: novaMetrica.descricao }]
    })
    setNovaMetrica({ titulo: '', descricao: '' })
    setShowNovaMetricaModal(false)
  }

  const handleRemoveMetrica = (id) => {
    setNovaParticaForm({
      ...novaParticaForm,
      metricas: novaParticaForm.metricas.filter(m => m.id !== id)
    })
  }

  const handleAddEvidencia = () => {
    if (!novaEvidencia.nome.trim()) {
      alert('Por favor, preencha o nome da evidência')
      return
    }

    setNovaParticaForm({
      ...novaParticaForm,
      evidencias: [...novaParticaForm.evidencias, { id: Date.now(), ...novaEvidencia }]
    })

    setNovaEvidencia({
      nome: '',
      arquivo: null
    })
  }

  const handleRemoveEvidencia = (id) => {
    setNovaParticaForm({
      ...novaParticaForm,
      evidencias: novaParticaForm.evidencias.filter(e => e.id !== id)
    })
  }

  const handleAddNovaPartica = async () => {
    if (!novaParticaForm.praticaChave.trim()) {
      alert('Por favor, preencha o título da prática')
      return
    }

    const novaPartica = {
      id: praticasChaves.length + 1,
      titulo: novaParticaForm.praticaChave,
      icone: '🎯',
      status: 'pending',
      ...novaParticaForm
    }

    // Gerar output JSON
    const jsonOutput = {
      praticaChave: novaPartica.praticaChave,
      objetivos: novaPartica.objetivos,
      meioacoes: novaPartica.meioacoes,
      publicoAlvo: novaPartica.publicoAlvo,
      periodicidade: novaPartica.periodicidade,
      procedimentos: novaPartica.procedimentos,
      metricas: novaPartica.metricas,
      aprendizado: novaPartica.aprendizado,
      evidencias: novaPartica.evidencias
    }

    console.log('=== JSON da Prática Chave ===')
    console.log(JSON.stringify(jsonOutput, null, 2))
    console.log('=============================')

    try {
      const payloadToSend = {
        pratica_chave: jsonOutput
      }
      const response = await api.post('/pratica-chave', payloadToSend)

      console.log('Resposta do servidor:', response)

      // Normalizar a nova prática antes de adicionar
      const normalizedNovaPartica = normalizePratica(novaPartica)
      setPraticasChaves([...praticasChaves, normalizedNovaPartica])

      // Resetar formulário e fechar modal
      setNovaParticaForm({
        praticaChave: '',
        objetivos: '',
        meioacoes: [],
        publicoAlvo: '',
        periodicidade: [],
        procedimentos: [],
        metricas: [],
        aprendizado: '',
        evidencias: []
      })
      setShowNovaParticaModal(false)

      // Mostrar mensagem de sucesso
      setMessageModalType('success')
      setMessageModalContent('Prática chave criada com sucesso!')
      setShowMessageModal(true)
    } catch (error) {
      console.error('Erro ao criar prática chave:', error)
      setMessageModalType('error')
      setMessageModalContent(error.message || 'Erro ao criar prática chave. Tente novamente.')
      setShowMessageModal(true)
    }
  }

  const handleCancelNovaPartica = () => {
    setNovaParticaForm({
      praticaChave: '',
      objetivos: '',
      meioacoes: [],
      publicoAlvo: '',
      periodicidade: [],
      procedimentos: [],
      metricas: [],
      aprendizado: '',
      evidencias: []
    })
    setShowNovaParticaModal(false)
  }

  const handleOpenNovoEventoModal = async () => {
    try {
      setLoadingEventoPraticas(true)
      setShowNovoEventoModal(true)

      // Carregar as práticas chaves do endpoint
      const response = await api.get('/pratica-chave')

      let praticas = []
      if (Array.isArray(response.data)) {
        praticas = response.data
      } else if (response.data && Array.isArray(response.data.praticas)) {
        praticas = response.data.praticas
      }

      console.log('📥 Dados brutos da API para evento:', praticas)

      // Normalizar os dados - usar mesma lógica que a sidebar
      praticas = praticas
        .map(item => {
          // Se item tem campo pratica_chave, mesclar com dados do wrapper (mesma lógica da sidebar)
          if (item && item.pratica_chave && typeof item.pratica_chave === 'object') {
            const merged = {
              id: item.id,
              titulo: item.titulo,
              icone: item.icone,
              status: item.status,
              ...item.pratica_chave
            }
            return normalizePratica(merged)
          }
          return normalizePratica(item)
        })
        .filter(p => p !== null)
        .map(item => {
          console.log('📦 Item normalizado:', item)
          console.log('📦 Meioacoes:', item.meioacoes?.length || 0)
          console.log('📦 Metricas:', item.metricas?.length || 0)
          return item
        })

      console.log('✅ Práticas chaves carregadas para evento:', praticas.length)
      console.log('📊 Todas as práticas:', praticas)
      console.log('🔍 Verificando meioacoes em cada prática:')
      praticas.forEach((p, idx) => {
        console.log(`  [${idx}] ${p.titulo}: meioacoes=${p.meioacoes?.length || 0}, metricas=${p.metricas?.length || 0}`)
      })
      setEventoPraticasChaves(praticas)
    } catch (err) {
      console.error('❌ Erro ao carregar práticas chaves:', err)
      setMessageModalType('error')
      setMessageModalContent(err.message || 'Erro ao carregar práticas chaves')
      setShowMessageModal(true)
    } finally {
      setLoadingEventoPraticas(false)
    }
  }

  const handleCancelNovoEvento = () => {
    setNovoEvento({
      praticaChaveId: '',
      titulo: '',
      descricao: '',
      objetivos: '',
      publicoAlvo: '',
      periodicidade: '',
      aprendizado: '',
      meioacoes: {},
      metricas: {},
      evidencias: []
    })
    setShowNovoEventoModal(false)
  }

  const handleCreateEvento = async () => {
    if (!novoEvento.praticaChaveId) {
      setMessageModalType('error')
      setMessageModalContent('Selecione uma prática chave')
      setShowMessageModal(true)
      return
    }

    // Encontrar a prática selecionada para pegar mais contexto
    const practicaSelecionada = eventoPraticasChaves.find(p => String(p.id) === String(novoEvento.praticaChaveId))

    // Gerar o JSON de output do evento
    const jsonOutput = {
      praticaChaveId: novoEvento.praticaChaveId,
      practicaChaveNome: practicaSelecionada?.titulo || '',
      titulo: novoEvento.titulo,
      descricao: novoEvento.descricao,
      objetivos: novoEvento.objetivos,
      publicoAlvo: novoEvento.publicoAlvo,
      periodicidade: novoEvento.periodicidade,
      aprendizado: novoEvento.aprendizado,
      meioacoes: novoEvento.meioacoes,
      metricas: novoEvento.metricas,
      evidencias: novoEvento.evidencias.length > 0 ? novoEvento.evidencias.map(f => f.name) : []
    }

    console.log('=== JSON do Evento ===')
    console.log(JSON.stringify(jsonOutput, null, 2))
    console.log('=======================')

    // Mostrar modal de visualização do JSON
    setEventoJsonOutput(jsonOutput)
    setShowEventoJsonModal(true)
  }

  const handleConfirmEventoJson = async () => {
    try {
      setLoadingEventoPraticas(true)

      const eventoData = {
        pratica_chave_id: novoEvento.praticaChaveId,
        titulo: novoEvento.titulo,
        descricao: novoEvento.descricao,
        objetivos: novoEvento.objetivos,
        publico_alvo: novoEvento.publicoAlvo,
        periodicidade: novoEvento.periodicidade,
        aprendizado: novoEvento.aprendizado,
        meios_acoes: novoEvento.meioacoes,
        metricas: novoEvento.metricas
      }

      console.log('📤 Criando evento com dados:', eventoData)
      const response = await api.post('/evento', eventoData)

      console.log('✅ Evento criado com sucesso!')

      setShowEventoJsonModal(false)
      setMessageModalType('success')
      setMessageModalContent('Evento criado com sucesso!')
      setShowMessageModal(true)

      handleCancelNovoEvento()
    } catch (error) {
      console.error('❌ Erro ao criar evento:', error)
      setMessageModalType('error')
      setMessageModalContent(error.message || 'Erro ao criar evento. Tente novamente.')
      setShowMessageModal(true)
    } finally {
      setLoadingEventoPraticas(false)
    }
  }

  const handleViewPlan = (plan) => {
    // Pass the plan data through navigation state
    navigate('/questionario-form', {
      replace: false,
      state: { viewPlan: plan }
    })
  }

  const handleApprove = async (plan) => {
    if (!plan.questionario_id) {
      console.error('❌ Questionario ID not found')
      alert('Erro: ID do questionário não encontrado')
      return
    }

    try {
      // Create the approval data with exported questionario JSON
      const approvalData = {
        timestamp: new Date().toISOString(),
        formData: plan.questionario?.formData || {},
        teamMembers: plan.questionario?.teamMembers || [],
        uploadedFiles: plan.questionario?.uploadedFiles || [],
        notes: plan.questionario?.notes || {},
        aprovado_por: user?.email
      }

      console.log('📤 Sending approve request for plan:', plan.questionario_id)
      console.log('Approval data:', approvalData)

      await api.put(`/questionario/questionario/${plan.questionario_id}`, approvalData)
      console.log('✅ Plan approved successfully!')
      alert('Plano aprovado com sucesso!')

      // Refresh the pending plans list
      setLoadingPendingPlans(true)
      let endpoint = '/plano/aprovar'
      if (currentSubmenu === 'aprovados') {
        endpoint = '/plano/aprovados'
      } else if (currentSubmenu === 'rejeitados') {
        endpoint = '/plano/rejeitados'
      }
      const response = await api.get(endpoint)
      setPendingPlans(response.data || [])
      setLoadingPendingPlans(false)
    } catch (error) {
      console.error('❌ Error approving plan:', error)
      alert('Erro ao aprovar o plano. Tente novamente.')
    }
  }

  const handleReject = async (plan) => {
    if (!plan.questionario_id) {
      console.error('❌ Questionario ID not found')
      alert('Erro: ID do questionário não encontrado')
      return
    }

    try {
      // Create the rejection data with exported questionario JSON
      const rejectionData = {
        timestamp: new Date().toISOString(),
        formData: plan.questionario?.formData || {},
        teamMembers: plan.questionario?.teamMembers || [],
        uploadedFiles: plan.questionario?.uploadedFiles || [],
        notes: plan.questionario?.notes || {},
        reprovado_por: user?.email
      }

      console.log('📤 Sending reject request for plan:', plan.questionario_id)
      console.log('Rejection data:', rejectionData)

      await api.put(`/questionario/questionario/${plan.questionario_id}`, rejectionData)
      console.log('✅ Plan rejected successfully!')
      alert('Plano rejeitado com sucesso!')

      // Refresh the pending plans list
      setLoadingPendingPlans(true)
      let endpoint = '/plano/aprovar'
      if (currentSubmenu === 'aprovados') {
        endpoint = '/plano/aprovados'
      } else if (currentSubmenu === 'rejeitados') {
        endpoint = '/plano/rejeitados'
      }
      const response = await api.get(endpoint)
      setPendingPlans(response.data || [])
      setLoadingPendingPlans(false)
    } catch (error) {
      console.error('❌ Error rejecting plan:', error)
      alert('Erro ao rejeitar o plano. Tente novamente.')
    }
  }

  // Calendar helper functions
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate()
  }

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay()
  }

  const handlePreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11)
      setCurrentYear(currentYear - 1)
    } else {
      setCurrentMonth(currentMonth - 1)
    }
    setSelectedDate(null)
  }

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0)
      setCurrentYear(currentYear + 1)
    } else {
      setCurrentMonth(currentMonth + 1)
    }
    setSelectedDate(null)
  }

  const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro']
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sab']

  const handleDateClick = (dateStr) => {
    if (isConsultor) {
      // Para consultores: suporta seleção de range
      let newStart, newEnd

      if (!selectedDateRangeStart) {
        newStart = dateStr
        newEnd = null
        setSelectedDateRangeStart(dateStr)
        setSelectedDate(dateStr)
      } else if (!selectedDateRangeEnd) {
        const start = new Date(selectedDateRangeStart)
        const end = new Date(dateStr)

        if (end < start) {
          newStart = dateStr
          newEnd = selectedDateRangeStart
          setSelectedDateRangeStart(dateStr)
          setSelectedDateRangeEnd(selectedDateRangeStart)
        } else {
          newStart = selectedDateRangeStart
          newEnd = dateStr
          setSelectedDateRangeEnd(dateStr)
        }
        setSelectedDate(dateStr)
      } else {
        newStart = dateStr
        newEnd = null
        setSelectedDateRangeStart(dateStr)
        setSelectedDateRangeEnd(null)
        setSelectedDate(dateStr)
      }

      // Atualiza editDaysPerDia em tempo real quando editando agendamento multi-dia
      if (editingAppointment && editingAppointment.startDate !== editingAppointment.endDate && !editingAppointment.isOpenAppointment) {
        const apt = editingAppointment
        const calStart = newStart
        const calEnd = newEnd || newStart

        let editStart = apt.startDate
        let editEnd = apt.endDate

        if (calStart && calStart >= apt.startDate && calStart <= apt.endDate) {
          editStart = calStart
          editEnd = (calEnd && calEnd >= editStart && calEnd <= apt.endDate) ? calEnd : editStart
        }

        const editDays = getDaysInRange(editStart, editEnd)
        const fullRangeDays = getDaysInRange(apt.startDate, apt.endDate)

        setEditDaysPerDia(editDays.map(date => ({ date, startHour: apt.startHour, endHour: apt.endHour })))
        setEditDayMode(editDays.length < fullRangeDays.length)
      }
    } else {
      // Para usuários normais: seleção de data única
      setSelectedDate(selectedDate === dateStr ? null : dateStr)
    }
  }

  const handleScheduleOnDate = (dateStr) => {
    setSelectedDate(dateStr)
    setShowAppointmentModal(true)
  }

  const checkTimeConflict = (startDate, endDate, startHour, endHour, isOpenAppointment, excludeId = null) => {
    // Verificar se há conflito com compromissos do MESMO consultor
    for (const apt of appointments) {
      if (apt.consultorEmail !== user?.email) continue
      if (excludeId !== null && apt.id === excludeId) continue

      // Converter datas para comparação
      const newStart = new Date(startDate)
      const newEnd = new Date(endDate)
      const aptStart = new Date(apt.startDate)
      const aptEnd = new Date(apt.endDate)

      // Verificar se as datas se sobrepõem
      const datesOverlap = newStart <= aptEnd && newEnd >= aptStart

      if (datesOverlap) {
        // Se algum dos compromissos é aberto (o dia todo), há conflito
        if (isOpenAppointment || apt.isOpenAppointment) {
          return true
        }

        // Verificar se os horários se sobrepõem
        const newStartHourInt = parseInt(startHour)
        const newEndHourInt = parseInt(endHour)
        const aptStartHourInt = parseInt(apt.startHour)
        const aptEndHourInt = parseInt(apt.endHour)

        // Há conflito se os horários se sobrepõem
        // (novo começa antes que existente termina) E (novo termina depois que existente começa)
        if (newStartHourInt < aptEndHourInt && newEndHourInt > aptStartHourInt) {
          return true
        }
      }
    }
    return false
  }

  const getDaysInRange = (startDate, endDate) => {
    const days = []
    let current = new Date(startDate + 'T00:00:00')
    const end = new Date(endDate + 'T00:00:00')
    while (current <= end) {
      days.push(current.toISOString().slice(0, 10))
      current.setDate(current.getDate() + 1)
    }
    return days
  }

  const addDays = (dateStr, n) => {
    const d = new Date(dateStr + 'T00:00:00')
    d.setDate(d.getDate() + n)
    return d.toISOString().slice(0, 10)
  }

  const handleHorarioModeChange = (mode) => {
    setHorarioMode(mode)
    if (mode === 'different') {
      const start = selectedDateRangeStart || selectedDate
      const end = selectedDateRangeEnd || selectedDate
      const days = getDaysInRange(start, end)
      setHorariosPerDia(days.map(date => ({
        date,
        startHour: appointmentForm.startHour,
        endHour: appointmentForm.endHour,
      })))
    }
  }

  const handleScheduleAppointment = async () => {
    if (!appointmentForm.title) {
      setMessageModalType('error')
      setMessageModalContent('Por favor, preencha o título do agendamento')
      setShowMessageModal(true)
      return
    }

    if (!selectedDate) {
      setMessageModalType('error')
      setMessageModalContent('Por favor, selecione uma data')
      setShowMessageModal(true)
      return
    }

    const isMultiDay = !editingAppointment && selectedDateRangeStart && selectedDateRangeEnd && selectedDateRangeStart !== selectedDateRangeEnd
    const useDifferentHours = isMultiDay && horarioMode === 'different' && !appointmentForm.isOpenAppointment

    // Validar horários no modo "diferente por dia"
    if (useDifferentHours) {
      for (const dia of horariosPerDia) {
        if (parseInt(dia.startHour) >= parseInt(dia.endHour)) {
          setMessageModalType('error')
          setMessageModalContent(`Horário inválido em ${dia.date}: início (${dia.startHour}:00) deve ser menor que término (${dia.endHour}:00).`)
          setShowMessageModal(true)
          return
        }
      }
    } else {
      const startHour = parseInt(appointmentForm.startHour)
      const endHour = parseInt(appointmentForm.endHour)
      if (!appointmentForm.isOpenAppointment && startHour >= endHour) {
        setMessageModalType('error')
        setMessageModalContent(`Horário Inválido!\n\nHora inicial: ${String(startHour).padStart(2, '0')}:00\nHora final: ${String(endHour).padStart(2, '0')}:00\n\nA hora de término deve ser maior que a hora de início.`)
        setShowMessageModal(true)
        return
      }
    }

    const _resetForm = () => {
      setShowAppointmentModal(false)
      setAppointmentForm({ title: '', description: '', responsible: '', startHour: '09', endHour: '10', isOpenAppointment: false })
      setSelectedDate(null)
      setSelectedDateRangeStart(null)
      setSelectedDateRangeEnd(null)
      setEditingAppointment(null)
      setEditingReservas([])
      setHorarioMode('same')
      setHorariosPerDia([])
      setEditDayMode(false)
      setEditDaysPerDia([])
    }

    const _buildPayload = (startDate, endDate, startHour, endHour) => {
      const compromisso = {
        id: Date.now() + Math.random(),
        titulo: appointmentForm.title,
        descricao: appointmentForm.description || '',
        responsavel: appointmentForm.responsible || '',
        dataInicio: startDate,
        dataFim: endDate,
        horaInicio: `${String(startHour).padStart(2, '0')}:00`,
        horaFim: `${String(endHour).padStart(2, '0')}:00`,
        ehCompromisoAberto: appointmentForm.isOpenAppointment,
        consultorEmail: user?.email,
      }
      return {
        agenda_json: {
          timestamp: new Date().toISOString(),
          consultor: { email: user?.email, id: user?.id, nome: user?.first_name || 'N/A' },
          totalCompromissos: 1,
          compromissos: [compromisso],
        }
      }
    }

    // Modo horário diferente por dia: envia lote em uma única request
    if (useDifferentHours) {
      try {
        const lotePayload = {
          agendamentos: horariosPerDia.map(dia => _buildPayload(dia.date, dia.date, dia.startHour, dia.endHour))
        }
        const responses = await api.post('/agenda/agendamento/lote', lotePayload)
        const responseList = responses.data || []
        const created = horariosPerDia.map((dia, idx) => ({
          id: responseList[idx]?.id || Date.now() + idx,
          agendaId: responseList[idx]?.id,
          startDate: dia.date,
          endDate: dia.date,
          startHour: dia.startHour,
          endHour: dia.endHour,
          isOpenAppointment: false,
          consultorEmail: user?.email,
          reservas: [],
          ...appointmentForm,
        }))
        setAppointments(prev => [...prev, ...created])
        setHasChanges(true)
        _resetForm()
        setMessageModalType('success')
        setMessageModalContent(`✅ ${created.length} agendamentos criados com sucesso!\n\n${appointmentForm.title}`)
        setShowMessageModal(true)
      } catch (error) {
        const statusCode = error.status || 'Erro desconhecido'
        const responseContent = error.responseData ? JSON.stringify(error.responseData, null, 2) : error.message
        setMessageModalType('error')
        setMessageModalContent(`STATUS: ${statusCode}\n\nRESPOSTA DO SERVIDOR:\n\n${responseContent}`)
        setShowMessageModal(true)
      }
      return
    }

    // Modo edição por dia: DELETE range original + POST lote preservando before/after
    const isEditDayMode = editDayMode && editingAppointment?.agendaId && editDaysPerDia.length > 0 && !appointmentForm.isOpenAppointment
    if (isEditDayMode) {
      if (parseInt(appointmentForm.startHour) >= parseInt(appointmentForm.endHour)) {
        setMessageModalType('error')
        setMessageModalContent(`Horário inválido: início (${appointmentForm.startHour}:00) deve ser menor que término (${appointmentForm.endHour}:00).`)
        setShowMessageModal(true)
        return
      }

      const aptStart = editingAppointment.startDate
      const aptEnd = editingAppointment.endDate
      const origStartHour = editingAppointment.startHour
      const origEndHour = editingAppointment.endHour
      const origTitle = editingAppointment.title
      const origDescription = editingAppointment.description || ''
      const origResponsible = editingAppointment.responsible || ''
      const editStart = editDaysPerDia[0].date
      const editEnd = editDaysPerDia[editDaysPerDia.length - 1].date

      // Monta entrada do lote com título/descrição/responsável explícitos
      const _entry = (startDate, endDate, startHour, endHour, titulo, descricao, responsavel, reservas = []) => ({
        agenda_json: {
          timestamp: new Date().toISOString(),
          consultor: { email: user?.email, id: user?.id, nome: user?.first_name || 'N/A' },
          totalCompromissos: 1,
          compromissos: [{
            id: Date.now() + Math.random(),
            titulo,
            descricao,
            responsavel,
            dataInicio: startDate,
            dataFim: endDate,
            horaInicio: `${String(startHour).padStart(2, '0')}:00`,
            horaFim: `${String(endHour).padStart(2, '0')}:00`,
            ehCompromisoAberto: false,
            consultorEmail: user?.email,
            reservas,
          }],
        }
      })

      const agendamentos = []
      const localItems = []

      // Range ANTES dos dias editados — mantém dados originais
      if (aptStart < editStart) {
        const beforeEnd = addDays(editStart, -1)
        const beforeReservas = editingReservas.filter(r => r.data >= aptStart && r.data <= beforeEnd)
        agendamentos.push(_entry(aptStart, beforeEnd, origStartHour, origEndHour, origTitle, origDescription, origResponsible, beforeReservas))
        localItems.push({ startDate: aptStart, endDate: beforeEnd, startHour: origStartHour, endHour: origEndHour, title: origTitle, description: origDescription, responsible: origResponsible, reservas: beforeReservas })
      }

      // Dias editados — usa dados do formulário (title/hora novos)
      for (const dia of editDaysPerDia) {
        const diaReservas = editingReservas.filter(r => r.data === dia.date)
        agendamentos.push(_entry(dia.date, dia.date, appointmentForm.startHour, appointmentForm.endHour, appointmentForm.title, appointmentForm.description || '', appointmentForm.responsible || '', diaReservas))
        localItems.push({ startDate: dia.date, endDate: dia.date, startHour: appointmentForm.startHour, endHour: appointmentForm.endHour, title: appointmentForm.title, description: appointmentForm.description || '', responsible: appointmentForm.responsible || '', reservas: diaReservas })
      }

      // Range APÓS os dias editados — mantém dados originais
      if (editEnd < aptEnd) {
        const afterStart = addDays(editEnd, 1)
        const afterReservas = editingReservas.filter(r => r.data >= afterStart && r.data <= aptEnd)
        agendamentos.push(_entry(afterStart, aptEnd, origStartHour, origEndHour, origTitle, origDescription, origResponsible, afterReservas))
        localItems.push({ startDate: afterStart, endDate: aptEnd, startHour: origStartHour, endHour: origEndHour, title: origTitle, description: origDescription, responsible: origResponsible, reservas: afterReservas })
      }

      try {
        await api.delete(`/agenda/agendamento/${editingAppointment.agendaId}`)
        const responses = await api.post('/agenda/agendamento/lote', { agendamentos })
        const responseList = responses.data || []

        const created = localItems.map((item, idx) => ({
          id: responseList[idx]?.id || Date.now() + idx,
          agendaId: responseList[idx]?.id,
          startDate: item.startDate,
          endDate: item.endDate,
          startHour: item.startHour,
          endHour: item.endHour,
          isOpenAppointment: false,
          consultorEmail: user?.email,
          reservas: item.reservas,
          title: item.title,
          description: item.description,
          responsible: item.responsible,
        }))

        setAppointments(prev => [
          ...prev.filter(a => a.agendaId !== editingAppointment.agendaId),
          ...created,
        ])
        setHasChanges(true)
        _resetForm()
        setMessageModalType('success')
        setMessageModalContent(`✅ Dias editados com sucesso!\n\n${editDaysPerDia.length} dia(s) alterado(s) em "${appointmentForm.title}"`)
        setShowMessageModal(true)
      } catch (error) {
        const statusCode = error.status || 'Erro desconhecido'
        const responseContent = error.responseData ? JSON.stringify(error.responseData, null, 2) : error.message
        setMessageModalType('error')
        setMessageModalContent(`STATUS: ${statusCode}\n\nRESPOSTA DO SERVIDOR:\n\n${responseContent}`)
        setShowMessageModal(true)
      }
      return
    }

    // Modo padrão (mesmo horário / edição)
    const appointmentStartDate = selectedDateRangeStart || selectedDate
    const appointmentEndDate = selectedDateRangeEnd || selectedDate
    const appointmentStartHour = appointmentForm.isOpenAppointment ? '00' : appointmentForm.startHour
    const appointmentEndHour = appointmentForm.isOpenAppointment ? '23' : appointmentForm.endHour

    if (checkTimeConflict(appointmentStartDate, appointmentEndDate, appointmentStartHour, appointmentEndHour, appointmentForm.isOpenAppointment, editingAppointment?.id ?? null)) {
      setMessageModalType('error')
      setMessageModalContent(`Conflito de Horário!\n\nJá existe um compromisso seu agendado para este período.\n\nPeriodo: ${appointmentStartDate}${appointmentEndDate !== appointmentStartDate ? ` até ${appointmentEndDate}` : ''}\nHorário: ${String(appointmentStartHour).padStart(2, '0')}:00 às ${String(appointmentEndHour).padStart(2, '0')}:00`)
      setShowMessageModal(true)
      return
    }

    const newAppointment = {
      id: editingAppointment ? editingAppointment.id : Date.now(),
      startDate: appointmentStartDate,
      endDate: appointmentEndDate,
      startHour: appointmentStartHour,
      endHour: appointmentEndHour,
      isOpenAppointment: appointmentForm.isOpenAppointment,
      consultorEmail: user?.email,
      consultorId: user?.id,
      reservas: editingAppointment ? editingReservas : [],
      agendaId: editingAppointment ? editingAppointment.agendaId : undefined,
      ...appointmentForm,
    }

    const agendaPayload = editingAppointment
      ? {
          agenda_json: {
            timestamp: new Date().toISOString(),
            consultor: { email: user?.email, id: user?.id, nome: user?.first_name || 'N/A' },
            totalCompromissos: 1,
            compromissos: [{
              id: newAppointment.id,
              titulo: newAppointment.title,
              descricao: newAppointment.description || '',
              responsavel: newAppointment.responsible || '',
              dataInicio: newAppointment.startDate,
              dataFim: newAppointment.endDate,
              horaInicio: `${String(newAppointment.startHour).padStart(2, '0')}:00`,
              horaFim: `${String(newAppointment.endHour).padStart(2, '0')}:00`,
              ehCompromisoAberto: newAppointment.isOpenAppointment,
              consultorEmail: newAppointment.consultorEmail,
            }],
          }
        }
      : _buildPayload(appointmentStartDate, appointmentEndDate, appointmentStartHour, appointmentEndHour)

    try {
      let response
      if (editingAppointment?.agendaId) {
        response = await api.put(`/agenda/agendamento/${editingAppointment.agendaId}`, agendaPayload)
      } else {
        response = await api.post('/agenda/agendamento', agendaPayload)
      }

      // Usa o ID retornado pelo servidor para garantir agendaId correto no estado local
      const savedAgendaId = response.data?.id ?? newAppointment.agendaId
      const finalAppointment = { ...newAppointment, agendaId: savedAgendaId }

      if (editingAppointment) {
        setAppointments(prev => prev.map(a => a.id === finalAppointment.id ? finalAppointment : a))
      } else {
        setAppointments(prev => [...prev, finalAppointment])
      }
      setHasChanges(true)
      _resetForm()

      const verb = editingAppointment ? 'atualizado' : 'criado'
      setMessageModalType('success')
      setMessageModalContent(`✅ Agendamento ${verb} com sucesso!\n\n${newAppointment.title}`)
      setShowMessageModal(true)
    } catch (error) {
      console.error('❌ Erro ao enviar agendamento:', error)
      const statusCode = error.status || 'Erro desconhecido'
      const responseContent = error.responseData
        ? (typeof error.responseData === 'string' ? error.responseData : JSON.stringify(error.responseData, null, 2))
        : error.message
      setMessageModalType('error')
      setMessageModalContent(`STATUS: ${statusCode}\n\nRESPOSTA DO SERVIDOR:\n\n${responseContent}`)
      setShowMessageModal(true)
    }
  }

  const handleCancelAppointment = () => {
    setShowAppointmentModal(false)
    setEditingAppointment(null)
    setEditingReservas([])
    setHorarioMode('same')
    setHorariosPerDia([])
    setEditDayMode(false)
    setEditDaysPerDia([])
    setAppointmentForm({
      title: '',
      description: '',
      responsible: '',
      startHour: '09',
      endHour: '10',
      isOpenAppointment: false,
    })
  }

  const handleEditAppointment = (apt) => {
    // Captura seleção do calendário ANTES de sobrescrever com o range do agendamento
    const calStart = selectedDateRangeStart || selectedDate
    const calEnd = selectedDateRangeEnd || calStart

    setEditingAppointment(apt)
    setEditingReservas(apt.reservas || [])

    if (apt.startDate !== apt.endDate && !apt.isOpenAppointment) {
      // Interseção: dias selecionados no calendário dentro do range do agendamento
      let editStart = apt.startDate
      let editEnd = apt.endDate

      if (calStart && calStart >= apt.startDate && calStart <= apt.endDate) {
        editStart = calStart
        editEnd = (calEnd && calEnd >= editStart && calEnd <= apt.endDate)
          ? calEnd
          : editStart
      }

      const editDays = getDaysInRange(editStart, editEnd)
      const fullRangeDays = getDaysInRange(apt.startDate, apt.endDate)

      setEditDaysPerDia(editDays.map(date => ({
        date,
        startHour: apt.startHour,
        endHour: apt.endHour,
      })))

      // Ativa editDayMode automaticamente quando a seleção é subconjunto do range
      setEditDayMode(editDays.length < fullRangeDays.length)
    } else {
      setEditDaysPerDia([])
      setEditDayMode(false)
    }

    setAppointmentForm({
      title: apt.title,
      description: apt.description || '',
      responsible: apt.responsible || '',
      startHour: apt.startHour,
      endHour: apt.endHour,
      isOpenAppointment: apt.isOpenAppointment || false,
    })
    setSelectedDate(apt.startDate)
    setSelectedDateRangeStart(apt.startDate)
    setSelectedDateRangeEnd(apt.endDate)
    setShowAppointmentModal(true)
  }

  const handleAppointmentClick = (apt) => {
    if (isConsultor || !isIncubado) return

    // Incubado já tem reserva em qualquer compromisso desta agenda?
    const jaTemReservaNestaAgenda = appointments
      .filter(a => a.agendaId === apt.agendaId)
      .some(a => (a.reservas || []).some(r => r.incubado === user?.email))
    if (jaTemReservaNestaAgenda) {
      setMessageModalType('error')
      setMessageModalContent('Você já possui uma reserva nesta agenda. Só é permitida uma reserva por agenda.')
      setShowMessageModal(true)
      return
    }

    // Determinar o dia inicial para o formulário
    const dayDefault =
      selectedDate && selectedDate >= apt.startDate && selectedDate <= apt.endDate
        ? selectedDate
        : apt.startDate

    const bookedIntervals = getBookedIntervals(apt.reservas, dayDefault)
    const availableStarts = getAvailableStartHours(apt.startHour, apt.endHour, bookedIntervals, 1)

    if (availableStarts.length === 0) {
      setMessageModalType('error')
      setMessageModalContent('Não há horários disponíveis neste agendamento.')
      setShowMessageModal(true)
      return
    }

    setReservacaoForm({
      data: dayDefault,
      horaInicio: String(availableStarts[0]).padStart(2, '0'),
      duracao: 1,
    })
    setSelectedAppointmentForConfirmation(apt)
    setShowConfirmationModal(true)
  }

  const handleConfirmAppointment = async () => {
    const apt = selectedAppointmentForConfirmation
    if (!apt) return

    try {
      setConfirmationLoading(true)

      const horaFim = parseInt(reservacaoForm.horaInicio) + reservacaoForm.duracao
      const payload = {
        compromisso_id: apt.id,
        hora_inicio: `${String(reservacaoForm.horaInicio).padStart(2, '0')}:00`,
        hora_fim: `${String(horaFim).padStart(2, '0')}:00`,
        data: reservacaoForm.data,
        empresa: user?.company || user?.empresa || '',
      }

      console.log('📅 Enviando reserva para agenda ID:', apt.agendaId, payload)
      await api.put(`/agenda/participar/${apt.agendaId}`, payload)

      const novaReserva = {
        incubado: user.email,
        empresa: payload.empresa,
        horaInicio: payload.hora_inicio,
        horaFim: payload.hora_fim,
        data: payload.data,
        dataParticipacao: new Date().toISOString(),
      }

      setAppointments(prev =>
        prev.map(a =>
          a.id === apt.id && a.agendaId === apt.agendaId
            ? { ...a, reservas: [...(a.reservas || []), novaReserva] }
            : a
        )
      )

      setShowConfirmationModal(false)
      setSelectedAppointmentForConfirmation(null)
      setMessageModalType('success')
      setMessageModalContent(
        `Reserva confirmada!\n\n${apt.title}\nDia: ${payload.data}\nHorário: ${payload.hora_inicio} às ${payload.hora_fim}`
      )
      setShowMessageModal(true)
    } catch (error) {
      console.error('❌ Erro ao confirmar reserva:', error)
      setMessageModalType('error')
      setMessageModalContent(`Erro ao confirmar reserva.\n\n${error.responseData?.detail || error.message}`)
      setShowMessageModal(true)
      setShowConfirmationModal(false)
      setSelectedAppointmentForConfirmation(null)
    } finally {
      setConfirmationLoading(false)
    }
  }

  const handleSaveAgenda = async () => {
    // Filtrar compromissos do usuário logado (consultor)
    const userAppointments = isConsultor
      ? appointments.filter(apt => apt.consultorEmail === user?.email)
      : appointments

    // Criar objeto de compromissos para enviar
    const compromissosFormatted = userAppointments.map(apt => ({
      id: apt.id,
      titulo: apt.title,
      descricao: apt.description || '',
      responsavel: apt.responsible || '',
      dataInicio: apt.startDate,
      dataFim: apt.endDate,
      horaInicio: `${String(apt.startHour).padStart(2, '0')}:00`,
      horaFim: `${String(apt.endHour).padStart(2, '0')}:00`,
      ehCompromisoAberto: apt.isOpenAppointment,
      consultorEmail: apt.consultorEmail
    }))

    // Criar objeto com todos os dados da agenda
    const agendaData = {
      timestamp: new Date().toISOString(),
      consultor: isConsultor ? {
        email: user?.email,
        id: user?.id,
        nome: user?.first_name || 'N/A'
      } : null,
      totalCompromissos: userAppointments.length,
      compromissos: compromissosFormatted
    }

    // Criar payload com chave agenda_json contendo todos os dados
    const agendaPayload = {
      agenda_json: agendaData
    }

    try {
      // Enviar POST request para /agenda/agendamento
      const payloadLog = JSON.stringify(agendaPayload, null, 2)
      console.log('📤 Enviando agenda para servidor...', payloadLog)
      const response = await api.post('/agenda/agendamento', agendaPayload)
      console.log('✅ Resposta do servidor:', response)

      // Mostrar mensagem de sucesso
      setHasChanges(false)  // Reseta modificações após salvar
      setMessageModalType('success')
      setMessageModalContent(`✅ Agenda salva com sucesso!\n\n${userAppointments.length} compromisso(s) sincronizado(s) com o servidor.`)
      setShowMessageModal(true)
    } catch (error) {
      console.error('❌ Erro ao salvar agenda:', error)

      let statusCode = error.status || 'Erro desconhecido'
      let responseContent = ''

      // Extrair informações detalhadas da resposta do servidor
      if (error.responseData) {
        console.error('📋 Resposta completa da API:', error.responseData)

        // Formatar a resposta completa em JSON
        if (typeof error.responseData === 'string') {
          responseContent = error.responseData
        } else {
          responseContent = JSON.stringify(error.responseData, null, 2)
        }
      } else {
        responseContent = error.message
      }

      // Exibir no modal com a resposta completa + payload enviada
      const payloadForDisplay = JSON.stringify(agendaPayload, null, 2)
      const modalContent = `STATUS: ${statusCode}\n\n===== PAYLOAD ENVIADO =====\n\n${payloadForDisplay}\n\n===== RESPOSTA DO SERVIDOR =====\n\n${responseContent}`

      setMessageModalType('error')
      setMessageModalContent(modalContent)
      setShowMessageModal(true)
    }
  }

  const getAppointmentsForDate = (date) => {
    return appointments.filter(apt => {
      // Mostra todos os compromissos retornados da API, independente do consultor
      const [aptStartYear, aptStartMonth, aptStartDay] = apt.startDate.split('-').map(Number)
      const [aptEndYear, aptEndMonth, aptEndDay] = apt.endDate.split('-').map(Number)
      const [dateYear, dateMonth, dateDay] = date.split('-').map(Number)

      const aptStart = new Date(aptStartYear, aptStartMonth - 1, aptStartDay)
      const aptEnd = new Date(aptEndYear, aptEndMonth - 1, aptEndDay)
      const checkDate = new Date(dateYear, dateMonth - 1, dateDay)

      return checkDate >= aptStart && checkDate <= aptEnd
    })
  }

  const renderCalendarDays = () => {
    const daysInMonth = getDaysInMonth(currentYear, currentMonth)
    const firstDay = getFirstDayOfMonth(currentYear, currentMonth)
    const days = []

    // Add empty cells for days before the month starts
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>)
    }

    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const scheduledAppointments = getAppointmentsForDate(dateStr)
      const isSelected = selectedDate === dateStr

      // Verificar se a data está dentro do range selecionado
      let isInRange = false
      if (selectedDateRangeStart && selectedDateRangeEnd) {
        const currentDate = new Date(dateStr)
        const rangeStart = new Date(selectedDateRangeStart)
        const rangeEnd = new Date(selectedDateRangeEnd)
        isInRange = currentDate >= rangeStart && currentDate <= rangeEnd
      }

      days.push(
        <div
          key={day}
          className={`calendar-day
            ${isSelected ? 'selected' : ''}
            ${isInRange ? 'in-range' : ''}
            ${scheduledAppointments.length > 0 ? 'has-appointment' : ''}
          `}
          onClick={() => handleDateClick(dateStr)}
          title={scheduledAppointments.length > 0 ? scheduledAppointments.map(apt => apt.title).join(', ') : ''}
        >
          <div className="day-number">{day}</div>
          <div className="day-indicators">
            {scheduledAppointments.length > 0 && <div className="appointment-count">{scheduledAppointments.length}</div>}
          </div>
          {scheduledAppointments.length > 0 && (
            <div className="day-appointments-preview">
              {scheduledAppointments.slice(0, 2).map(apt => (
                <div key={apt.id} className="appointment-preview-item">{apt.title}</div>
              ))}
              {scheduledAppointments.length > 2 && (
                <div className="appointment-preview-more">+{scheduledAppointments.length - 2}</div>
              )}
            </div>
          )}
        </div>
      )
    }

    return days
  }

  return (
    <>
      {!isIncubado && !loadingApproval && !isConsultor && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h2>⏳ Aguardando Aprovação</h2>
            <p>Sua conta está aguardando aprovação do administrador. Você será notificado assim que for aprovado.</p>
            <button
              className="modal-button"
              onClick={handleLogout}
            >
              Sair
            </button>
          </div>
        </div>
      )}

      <div className={`dashboard-wrapper ${!isIncubado && !loadingApproval && !isConsultor ? 'hidden' : ''}`}>
        <aside className={`dashboard-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
          <div className="sidebar-header">
            <div className="logo">
              <span className="logo-icon">📊</span>
              <span className="logo-text">TecCampos</span>
            </div>
            <button
              className="sidebar-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title={sidebarOpen ? 'Fechar menu' : 'Abrir menu'}
            >
              ✕
            </button>
          </div>

          <nav className="sidebar-nav">
            <button
              className={`nav-item ${currentSection === 'overview' ? 'active' : ''}`}
              onClick={() => setCurrentSection('overview')}
            >
              <span className="nav-icon">📊</span>
              <span className="nav-label">Overview</span>
            </button>
            <button
              className={`nav-item ${currentSection === 'agenda' ? 'active' : ''}`}
              onClick={() => setCurrentSection('agenda')}
            >
              <span className="nav-icon">📅</span>
              <span className="nav-label">Agenda</span>
            </button>
            <div className="nav-group">
              <button
                className={`nav-item ${currentSection === 'atividades' ? 'active' : ''}`}
                onClick={() => {
                  setCurrentSection('atividades')
                  setAtividadesSubmenuOpen(!atividadesSubmenuOpen)
                }}
              >
                <span className="nav-icon">✓</span>
                <span className="nav-label">Atividades</span>
                <span className={`submenu-arrow ${atividadesSubmenuOpen ? 'open' : ''}`}>▼</span>
              </button>
              {atividadesSubmenuOpen && (
                <div className="submenu">
                  <button
                    className={`submenu-item ${currentAtividadesSubmenu === 'praticas-chaves' ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentAtividadesSubmenu('praticas-chaves')
                      setCurrentSection('atividades')
                    }}
                  >
                    <span className="submenu-icon">🎯</span>
                    <span className="submenu-label">Práticas Chaves</span>
                  </button>
                  <button
                    className={`submenu-item ${currentAtividadesSubmenu === 'eventos' ? 'active' : ''}`}
                    onClick={() => {
                      setCurrentAtividadesSubmenu('eventos')
                      setCurrentSection('atividades')
                    }}
                  >
                    <span className="submenu-icon">📅</span>
                    <span className="submenu-label">Eventos</span>
                  </button>
                </div>
              )}
            </div>
            {isConsultor && (
              <div className="nav-group">
                <button
                  className={`nav-item ${currentSection === 'gerenciar-projetos' ? 'active' : ''}`}
                  onClick={() => {
                    setCurrentSection('gerenciar-projetos')
                    setSubmenuOpen(!submenuOpen)
                  }}
                >
                  <span className="nav-icon">📁</span>
                  <span className="nav-label">Gerenciar Projetos</span>
                  <span className={`submenu-arrow ${submenuOpen ? 'open' : ''}`}>▼</span>
                </button>
                {submenuOpen && (
                  <div className="submenu">
                    <button
                      className={`submenu-item ${currentSubmenu === 'gerenciar' ? 'active' : ''}`}
                      onClick={() => {
                        setCurrentSubmenu('gerenciar')
                        setCurrentSection('gerenciar-projetos')
                      }}
                    >
                      <span className="submenu-icon">📋</span>
                      <span className="submenu-label">Gerenciar</span>
                    </button>
                    <button
                      className={`submenu-item ${currentSubmenu === 'aprovados' ? 'active' : ''}`}
                      onClick={() => {
                        setCurrentSubmenu('aprovados')
                        setCurrentSection('gerenciar-projetos')
                      }}
                    >
                      <span className="submenu-icon">✅</span>
                      <span className="submenu-label">Aprovados</span>
                    </button>
                    <button
                      className={`submenu-item ${currentSubmenu === 'rejeitados' ? 'active' : ''}`}
                      onClick={() => {
                        setCurrentSubmenu('rejeitados')
                        setCurrentSection('gerenciar-projetos')
                      }}
                    >
                      <span className="submenu-icon">❌</span>
                      <span className="submenu-label">Rejeitados</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </nav>

          <div className="sidebar-footer">
            <button onClick={handleLogout} className="logout-sidebar-btn">
              <span className="nav-icon">🚪</span>
              <span className="nav-label">Logout</span>
            </button>
          </div>
        </aside>

        <div className="dashboard-container">
          <div className="dashboard-header">
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              title="Toggle menu"
            >
              ☰
            </button>
            <h1>Tec Campos Dashboard</h1>
            <div className="header-actions">
              <span className="user-info">👤 {user?.email || 'Admin'}</span>
              <button onClick={handleLogout} className="logout-btn">
                Logout
              </button>
            </div>
          </div>

          <div className="dashboard-content">
            {currentSection === 'overview' && isConsultor && (
              <div className="overview-section">
                <h2>Visão Geral</h2>
                <div className="stats-grid">
                  <div className="stat-card" onClick={handleAbrirQuestionariosConsultor} style={{ cursor: 'pointer' }}>
                    <div className="stat-icon">📋</div>
                    <div className="stat-info">
                      <h3>Questionários</h3>
                    </div>
                  </div>
                  <div className="stat-card" style={{ cursor: 'pointer' }}>
                    <div className="stat-icon">📊</div>
                    <div className="stat-info">
                      <h3>Indicadores</h3>
                    </div>
                  </div>
                </div>

                {showQuestionariosConsultor && (
                  <div className="questionarios-consultor-panel">
                    <div className="qc-panel-header">
                      <h3>Questionários Disponíveis</h3>
                      <button className="qc-close-btn" onClick={() => setShowQuestionariosConsultor(false)}>✕</button>
                    </div>
                    {loadingQuestionariosConsultor ? (
                      <div className="qc-loading">Carregando...</div>
                    ) : questionariosConsultor.length === 0 ? (
                      <div className="qc-empty">Nenhum questionário encontrado.</div>
                    ) : (
                      <ul className="qc-lista">
                        {questionariosConsultor.map((q, i) => (
                          <li key={q.id || i} className="qc-item qc-item-clicavel" onClick={() => handleVerQuestionarioConsultor(q)}>
                            <span className="qc-icon">📄</span>
                            <span className="qc-nome">{q.nome_negocio || 'Sem nome'}</span>
                            <span className="qc-abrir">↗</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}

            {currentSection === 'overview' && !isConsultor && (
              <div className="overview-section">
                <h2>Visão Geral</h2>
                <div className="stats-grid">
                  {isIncubado && (
                    <div className="stat-card" onClick={handleGerarPDFQuestionario} style={{ cursor: 'pointer' }}>
                      <div className="stat-icon">📋</div>
                      <div className="stat-info">
                        <h3>Questionario</h3>
                      </div>
                    </div>
                  )}
                  {isIncubado && (
                    <div className="stat-card" onClick={handleGerarPDFMembros} style={{ cursor: 'pointer' }}>
                      <div className="stat-icon">👥</div>
                      <div className="stat-info">
                        <h3>Membros</h3>
                      </div>
                    </div>
                  )}
                  {isIncubado && (
                    <div className="stat-card" style={{ cursor: 'pointer' }}>
                      <div className="stat-icon">📊</div>
                      <div className="stat-info">
                        <h3>Indicadores</h3>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {currentSection === 'agenda' && (
              <div className="agenda-section">
                <h2>Agenda</h2>
                <div className="agenda-container">
                  <div className="calendar-wrapper">
                    <div className="calendar-header">
                      <button className="month-nav-btn" onClick={handlePreviousMonth}>◀</button>
                      <h3 className="month-title">{monthNames[currentMonth]} {currentYear}</h3>
                      <button className="month-nav-btn" onClick={handleNextMonth}>▶</button>
                    </div>

                    <div className="calendar-section">
                      <div className="weekdays">
                        {dayNames.map(day => (
                          <div key={day} className="weekday">{day}</div>
                        ))}
                      </div>
                      <div className="calendar-grid">
                        {renderCalendarDays()}
                      </div>
                    </div>
                  </div>

                  <div className="right-column">
                    <div className="events-sidebar">
                      <div className="events-header">
                        <h3>
                          {selectedDate ? `${selectedDate}` : 'Selecione uma data'}
                        </h3>
                      </div>
                      <div className="events-list">
                        {selectedDate ? (
                          <>
                            {isConsultor && (
                              <div className="schedule-action-button">
                                <button
                                  className="schedule-btn"
                                  onClick={() => handleScheduleOnDate(selectedDate)}
                                  title="Agendar um compromisso para este dia"
                                >
                                  🕒 Agendar Compromisso
                                </button>
                              </div>
                            )}

                            {getAppointmentsForDate(selectedDate).length > 0 && (
                              <div className="event-section">
                                <div className="section-title">Agendamentos</div>
                                {getAppointmentsForDate(selectedDate).map(apt => {
                                  const slotTotalHours = parseInt(apt.endHour) - parseInt(apt.startHour)
                                  const bookedToday = getBookedHoursForDay(apt.reservas, selectedDate)
                                  const availableToday = slotTotalHours - bookedToday
                                  const userHasReserva = (apt.reservas || []).some(r => r.incubado === user?.email)
                                  const userHasReservaNestaAgenda = isIncubado && appointments
                                    .filter(a => a.agendaId === apt.agendaId)
                                    .some(a => (a.reservas || []).some(r => r.incubado === user?.email))
                                  const isFull = availableToday <= 0
                                  const canEdit = isConsultor && apt.consultorEmail === user?.email && (apt.reservas || []).length === 0
                                  return (
                                  <div
                                    key={apt.id}
                                    className={`appointment-item ${userHasReserva ? 'participated' : (userHasReservaNestaAgenda ? 'participated' : (isFull ? '' : (!isConsultor && isIncubado ? 'clickable' : '')))} `}
                                    onClick={() => handleAppointmentClick(apt)}
                                  >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                      <div className="apt-title">{apt.title}</div>
                                      {canEdit && (
                                        <button
                                          className="btn btn-secondary"
                                          style={{ fontSize: '12px', padding: '2px 10px', marginLeft: '8px', flexShrink: 0 }}
                                          onClick={(e) => { e.stopPropagation(); handleEditAppointment(apt) }}
                                        >
                                          Editar
                                        </button>
                                      )}
                                    </div>
                                    <div className="apt-consultor">
                                      💼 Consultor: {apt.consultorEmail}
                                    </div>
                                    <div className="apt-period">
                                      {apt.startHour}:00 às {apt.endHour}:00
                                      {' '}· {slotTotalHours}h total
                                      {' '}· <span style={{ color: isFull ? '#ef4444' : '#16a34a' }}>
                                        {availableToday}h disponível
                                      </span>
                                    </div>
                                    {(apt.reservas || []).length > 0 && (
                                      <div className="apt-reservas">
                                        {apt.reservas.map((r, i) => (
                                          <div key={i} className="apt-reserva-item" style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>
                                            🔒 {r.horaInicio}–{r.horaFim}: {r.incubado}{r.empresa ? ` (${r.empresa})` : ''}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                    {!isFull && !userHasReservaNestaAgenda && !isConsultor && isIncubado && (
                                      <div className="apt-click-hint">Clique para reservar um horário</div>
                                    )}
                                    {isFull && !userHasReservaNestaAgenda && !isConsultor && isIncubado && (
                                      <div className="apt-click-hint" style={{ color: '#ef4444' }}>Sem horários disponíveis</div>
                                    )}
                                    {apt.description && <div className="apt-description">{apt.description}</div>}
                                    {apt.responsible && <div className="apt-responsible">👤 {apt.responsible}</div>}
                                  </div>
                                  )
                                })}
                              </div>
                            )}
                            {getAppointmentsForDate(selectedDate).length === 0 && (
                              <div className="no-events">
                                <p>Nenhum agendamento nesta data</p>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="no-events">
                            <p>Clique em uma data para agendar</p>
                            <p className="hint">
                              {isConsultor
                                ? 'Clique em duas datas para selecionar um range, ou em uma data para seleção única'
                                : 'Você pode agendar um compromisso por hora'}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {isConsultor && (
                      <div className="agenda-save-card">
                        <button
                          className="save-agenda-btn"
                          onClick={handleSaveAgenda}
                          disabled={!hasChanges}
                          title={hasChanges ? "Salvar agenda no servidor" : "Nenhuma modificação para salvar"}
                        >
                          💾 Salvar Agenda
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {showAppointmentModal && isConsultor && (
                  <div className="modal-overlay appointment-modal-overlay">
                    <div className="appointment-modal">
                      <div className="modal-header">
                        <h2>{editingAppointment ? 'Editar Compromisso' : 'Agendar Compromisso'}</h2>
                        <button
                          className="modal-close"
                          onClick={handleCancelAppointment}
                        >
                          ✕
                        </button>
                      </div>

                      <div className="modal-content">
                        <div className="form-group">
                          <label>Data</label>
                          <div className="period-display">
                            {selectedDateRangeStart && selectedDateRangeEnd
                              ? `${selectedDateRangeStart} até ${selectedDateRangeEnd}`
                              : selectedDate}
                          </div>
                        </div>

                        {isConsultor && (
                          <div className="form-group">
                            <label htmlFor="open-appointment">
                              <input
                                id="open-appointment"
                                type="checkbox"
                                checked={appointmentForm.isOpenAppointment}
                                onChange={(e) => setAppointmentForm({
                                  ...appointmentForm,
                                  isOpenAppointment: e.target.checked
                                })}
                              />
                              Compromisso Aberto (o dia todo)
                            </label>
                          </div>
                        )}

                        {/* Toggle editar por dia: só aparece na edição de range multi-dia */}
                        {editingAppointment && !appointmentForm.isOpenAppointment &&
                          editDaysPerDia.length > 0 && (
                          <div className="form-group">
                            <label>Modo de edição</label>
                            <div className="horario-mode-toggle">
                              <label className={`horario-mode-option ${!editDayMode ? 'active' : ''}`}>
                                <input
                                  type="radio"
                                  name="editMode"
                                  checked={!editDayMode}
                                  onChange={() => setEditDayMode(false)}
                                />
                                Editar range completo ({editingAppointment.startDate} até {editingAppointment.endDate})
                              </label>
                              <label className={`horario-mode-option ${editDayMode ? 'active' : ''}`}>
                                <input
                                  type="radio"
                                  name="editMode"
                                  checked={editDayMode}
                                  onChange={() => setEditDayMode(true)}
                                />
                                Editar horário por dia
                                {editDaysPerDia.length > 0 && (
                                  <span className="edit-day-hint">
                                    {editDaysPerDia.length === 1
                                      ? ` — ${editDaysPerDia[0].date}`
                                      : ` — ${editDaysPerDia[0].date} até ${editDaysPerDia[editDaysPerDia.length - 1].date}`}
                                  </span>
                                )}
                              </label>
                            </div>
                          </div>
                        )}

                        {/* Dias selecionados para edição (modo edição por dia) */}
                        {editingAppointment && editDayMode && editDaysPerDia.length > 0 && (
                          <div className="form-group">
                            <label>Dias que serão editados</label>
                            <div className="horarios-per-dia-list">
                              {editDaysPerDia.map((dia) => (
                                <div key={dia.date} className="horario-dia-row">
                                  <span className="horario-dia-label">{dia.date}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Horário único (padrão) — oculto no modo edição por dia */}
                        {/* Toggle de modo de horário: só aparece em range multi-dia na criação */}
                        {!editingAppointment && !appointmentForm.isOpenAppointment &&
                          selectedDateRangeStart && selectedDateRangeEnd &&
                          selectedDateRangeStart !== selectedDateRangeEnd && (
                          <div className="form-group">
                            <label>Modo de horário</label>
                            <div className="horario-mode-toggle">
                              <label className={`horario-mode-option ${horarioMode === 'same' ? 'active' : ''}`}>
                                <input
                                  type="radio"
                                  name="horarioMode"
                                  value="same"
                                  checked={horarioMode === 'same'}
                                  onChange={() => setHorarioMode('same')}
                                />
                                Mesmo horário para todos os dias
                              </label>
                              <label className={`horario-mode-option ${horarioMode === 'different' ? 'active' : ''}`}>
                                <input
                                  type="radio"
                                  name="horarioMode"
                                  value="different"
                                  checked={horarioMode === 'different'}
                                  onChange={() => handleHorarioModeChange('different')}
                                />
                                Horário diferente por dia
                              </label>
                            </div>
                          </div>
                        )}

                        {/* Horário único (padrão) */}
                        {!appointmentForm.isOpenAppointment && (horarioMode === 'same' || editDayMode) && (
                          <div className="form-group">
                            <label>Horário</label>
                            <div className="time-range-container">
                            <div className="time-input-group">
                              <label htmlFor="start-hour">Início</label>
                              <div className="hour-selector">
                                <select
                                  id="start-hour"
                                  className="hour-select"
                                  value={appointmentForm.startHour}
                                  onChange={(e) => setAppointmentForm({
                                    ...appointmentForm,
                                    startHour: e.target.value
                                  })}
                                >
                                  {Array.from({ length: 24 }, (_, i) => {
                                    const hour = String(i).padStart(2, '0')
                                    return <option key={hour} value={hour}>{hour}:00</option>
                                  })}
                                </select>
                              </div>
                            </div>

                            <span className="time-separator">até</span>

                            <div className="time-input-group">
                              <label htmlFor="end-hour">Término</label>
                              <div className="hour-selector">
                                <select
                                  id="end-hour"
                                  className="hour-select"
                                  value={appointmentForm.endHour}
                                  onChange={(e) => setAppointmentForm({
                                    ...appointmentForm,
                                    endHour: e.target.value
                                  })}
                                >
                                  {Array.from({ length: 24 }, (_, i) => {
                                    const hour = String(i).padStart(2, '0')
                                    return <option key={hour} value={hour}>{hour}:00</option>
                                  })}
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                        )}

                        {/* Horários diferentes por dia */}
                        {!appointmentForm.isOpenAppointment && horarioMode === 'different' && horariosPerDia.length > 0 && (
                          <div className="form-group">
                            <label>Horários por dia</label>
                            <div className="horarios-per-dia-list">
                              {horariosPerDia.map((dia, idx) => (
                                <div key={dia.date} className="horario-dia-row">
                                  <span className="horario-dia-label">{dia.date}</span>
                                  <div className="time-range-container">
                                    <div className="time-input-group">
                                      <label>Início</label>
                                      <select
                                        className="hour-select"
                                        value={dia.startHour}
                                        onChange={(e) => setHorariosPerDia(prev =>
                                          prev.map((d, i) => i === idx ? { ...d, startHour: e.target.value } : d)
                                        )}
                                      >
                                        {Array.from({ length: 24 }, (_, i) => {
                                          const hour = String(i).padStart(2, '0')
                                          return <option key={hour} value={hour}>{hour}:00</option>
                                        })}
                                      </select>
                                    </div>
                                    <span className="time-separator">até</span>
                                    <div className="time-input-group">
                                      <label>Término</label>
                                      <select
                                        className="hour-select"
                                        value={dia.endHour}
                                        onChange={(e) => setHorariosPerDia(prev =>
                                          prev.map((d, i) => i === idx ? { ...d, endHour: e.target.value } : d)
                                        )}
                                      >
                                        {Array.from({ length: 24 }, (_, i) => {
                                          const hour = String(i).padStart(2, '0')
                                          return <option key={hour} value={hour}>{hour}:00</option>
                                        })}
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="form-group">
                          <label htmlFor="apt-title">Título *</label>
                          <input
                            id="apt-title"
                            type="text"
                            className="form-input"
                            placeholder="Digite o título do agendamento"
                            value={appointmentForm.title}
                            onChange={(e) => setAppointmentForm({
                              ...appointmentForm,
                              title: e.target.value
                            })}
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="apt-description">Descrição</label>
                          <textarea
                            id="apt-description"
                            className="form-input form-textarea"
                            placeholder="Descrição do agendamento (opcional)"
                            value={appointmentForm.description}
                            onChange={(e) => setAppointmentForm({
                              ...appointmentForm,
                              description: e.target.value
                            })}
                            rows="3"
                          />
                        </div>

                        <div className="form-group">
                          <label htmlFor="apt-responsible">Responsável</label>
                          <input
                            id="apt-responsible"
                            type="text"
                            className="form-input"
                            placeholder="Nome do responsável (opcional)"
                            value={appointmentForm.responsible}
                            onChange={(e) => setAppointmentForm({
                              ...appointmentForm,
                              responsible: e.target.value
                            })}
                          />
                        </div>
                      </div>

                      {editingAppointment && editingReservas.length > 0 && (
                        <div className="edit-reservas-warning">
                          <p className="edit-reservas-warning-title">
                            ⚠️ Esta agenda possui {editingReservas.length} reserva(s) de incubados. Remova os horários que entram em conflito com a sua edição.
                          </p>
                          <ul className="edit-reservas-list">
                            {editingReservas.map((r, idx) => (
                              <li key={idx} className="edit-reservas-item">
                                <span>
                                  <strong>{r.empresa || r.incubado}</strong> — {r.data} {r.horaInicio}–{r.horaFim}
                                </span>
                                <button
                                  type="button"
                                  className="btn-remove-reserva"
                                  onClick={() => setEditingReservas(prev => prev.filter((_, i) => i !== idx))}
                                >
                                  Remover
                                </button>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="modal-footer">
                        <button
                          className="btn btn-secondary"
                          onClick={handleCancelAppointment}
                        >
                          Cancelar
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={handleScheduleAppointment}
                        >
                          {editingAppointment ? 'Salvar Alterações' : 'Agendar'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {showMessageModal && (
                  <div className="modal-overlay">
                    <div
                      className="modal-content"
                      style={{
                        maxWidth: messageModalContent.includes('RESPOSTA DO SERVIDOR') ? '600px' : '400px',
                        maxHeight: messageModalContent.includes('RESPOSTA DO SERVIDOR') ? '80vh' : 'auto',
                        overflow: messageModalContent.includes('RESPOSTA DO SERVIDOR') ? 'auto' : 'visible'
                      }}
                    >
                      <div className="modal-icon" style={{ fontSize: messageModalType === 'error' ? '48px' : '48px' }}>
                        {messageModalType === 'error' ? '❌' : '✅'}
                      </div>
                      <h3 style={{ marginTop: '16px', color: messageModalType === 'error' ? '#ef4444' : '#10b981' }}>
                        {messageModalType === 'error' ? 'Erro' : 'Sucesso'}
                      </h3>
                      <p style={{
                        marginTop: '12px',
                        whiteSpace: 'pre-wrap',
                        textAlign: messageModalContent.includes('RESPOSTA DO SERVIDOR') ? 'left' : 'center',
                        color: '#374151',
                        fontSize: messageModalContent.includes('RESPOSTA DO SERVIDOR') ? '12px' : '14px',
                        fontFamily: messageModalContent.includes('RESPOSTA DO SERVIDOR') ? 'monospace' : 'inherit',
                        overflowX: 'auto'
                      }}>
                        {messageModalContent}
                      </p>
                      <button
                        className="btn btn-primary"
                        onClick={() => setShowMessageModal(false)}
                        style={{ marginTop: '20px', width: '100%' }}
                      >
                        OK
                      </button>
                    </div>
                  </div>
                )}

                {showConfirmationModal && selectedAppointmentForConfirmation && (() => {
                  const apt = selectedAppointmentForConfirmation
                  const slotStart = parseInt(apt.startHour)
                  const slotEnd = parseInt(apt.endHour)
                  const daysInRange = getDaysInRange(apt.startDate, apt.endDate)
                  const bookedIntervals = getBookedIntervals(apt.reservas, reservacaoForm.data)
                  const availableStarts = getAvailableStartHours(slotStart, slotEnd, bookedIntervals, reservacaoForm.duracao)
                  const maxDuracao = getMaxDuracao(slotEnd, parseInt(reservacaoForm.horaInicio), bookedIntervals)
                  const horaFimCalc = parseInt(reservacaoForm.horaInicio) + reservacaoForm.duracao
                  const bookedToday = getBookedHoursForDay(apt.reservas, reservacaoForm.data)
                  const availableToday = (slotEnd - slotStart) - bookedToday

                  const handleDayChange = (newData) => {
                    const newBooked = getBookedIntervals(apt.reservas, newData)
                    const newStarts = getAvailableStartHours(slotStart, slotEnd, newBooked, 1)
                    setReservacaoForm(f => ({
                      ...f,
                      data: newData,
                      horaInicio: String(newStarts[0] ?? slotStart).padStart(2, '0'),
                      duracao: 1,
                    }))
                  }

                  const handleStartChange = (newStart) => {
                    const newBooked = bookedIntervals
                    const newMax = getMaxDuracao(slotEnd, parseInt(newStart), newBooked)
                    setReservacaoForm(f => ({
                      ...f,
                      horaInicio: newStart,
                      duracao: Math.min(f.duracao, newMax || 1),
                    }))
                  }

                  const handleDuracaoChange = (newDur) => {
                    const newStarts = getAvailableStartHours(slotStart, slotEnd, bookedIntervals, newDur)
                    const curStart = parseInt(reservacaoForm.horaInicio)
                    const startOk = newStarts.includes(curStart)
                    setReservacaoForm(f => ({
                      ...f,
                      duracao: newDur,
                      horaInicio: startOk ? f.horaInicio : String(newStarts[0] ?? slotStart).padStart(2, '0'),
                    }))
                  }

                  return (
                    <div className="modal-overlay">
                      <div className="modal-content" style={{ maxWidth: '480px' }}>
                        <div style={{ fontSize: '36px', textAlign: 'center' }}>🗓️</div>
                        <h3 style={{ marginTop: '12px', color: 'var(--primary)', textAlign: 'center' }}>
                          Reservar Horário
                        </h3>
                        <p style={{ marginTop: '8px', textAlign: 'center', fontWeight: 600 }}>{apt.title}</p>
                        <p style={{ textAlign: 'center', fontSize: '13px', color: '#6b7280' }}>
                          Consultor: {apt.consultorEmail}
                        </p>
                        <p style={{ textAlign: 'center', fontSize: '13px', color: '#374151', marginTop: '4px' }}>
                          Slot: {apt.startHour}:00–{apt.endHour}:00
                          {' '}· <strong style={{ color: availableToday > 0 ? '#16a34a' : '#ef4444' }}>
                            {availableToday}h disponível
                          </strong>
                        </p>

                        {(apt.reservas || []).length > 0 && (
                          <div style={{ marginTop: '12px', background: '#f9fafb', borderRadius: '8px', padding: '8px 12px', fontSize: '12px', color: '#6b7280' }}>
                            <strong>Já reservado:</strong>
                            {apt.reservas.map((r, i) => (
                              <div key={i}>🔒 {r.data} · {r.horaInicio}–{r.horaFim} · {r.incubado}</div>
                            ))}
                          </div>
                        )}

                        <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {daysInRange.length > 1 && (
                            <div>
                              <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Dia</label>
                              <select
                                value={reservacaoForm.data}
                                onChange={e => handleDayChange(e.target.value)}
                                style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                              >
                                {daysInRange.map(d => <option key={d} value={d}>{d}</option>)}
                              </select>
                            </div>
                          )}

                          <div>
                            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Horário de início</label>
                            <select
                              value={reservacaoForm.horaInicio}
                              onChange={e => handleStartChange(e.target.value)}
                              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                            >
                              {availableStarts.length > 0
                                ? availableStarts.map(h => (
                                    <option key={h} value={String(h).padStart(2, '0')}>
                                      {String(h).padStart(2, '0')}:00
                                    </option>
                                  ))
                                : <option value="">Sem horários disponíveis</option>
                              }
                            </select>
                          </div>

                          <div>
                            <label style={{ fontSize: '13px', fontWeight: 600, display: 'block', marginBottom: '4px' }}>Duração</label>
                            <select
                              value={reservacaoForm.duracao}
                              onChange={e => handleDuracaoChange(parseInt(e.target.value))}
                              style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                              disabled={maxDuracao === 0}
                            >
                              {Array.from({ length: maxDuracao }, (_, i) => i + 1).map(d => (
                                <option key={d} value={d}>
                                  {d}h — até {String(parseInt(reservacaoForm.horaInicio) + d).padStart(2, '0')}:00
                                </option>
                              ))}
                            </select>
                          </div>

                          {availableStarts.length > 0 && (
                            <p style={{ fontSize: '13px', color: '#374151', textAlign: 'center' }}>
                              Reserva: <strong>{String(reservacaoForm.horaInicio).padStart(2, '0')}:00 às {String(horaFimCalc).padStart(2, '0')}:00</strong> no dia <strong>{reservacaoForm.data}</strong>
                            </p>
                          )}
                        </div>

                        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                          <button
                            className="btn btn-secondary"
                            onClick={() => { setShowConfirmationModal(false); setSelectedAppointmentForConfirmation(null) }}
                            disabled={confirmationLoading}
                            style={{ flex: 1 }}
                          >
                            Cancelar
                          </button>
                          <button
                            className="btn btn-primary"
                            onClick={handleConfirmAppointment}
                            disabled={confirmationLoading || availableStarts.length === 0}
                            style={{ flex: 1 }}
                          >
                            {confirmationLoading ? '⏳ Reservando...' : `Reservar ${reservacaoForm.duracao}h`}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                })()}
              </div>
            )}

            {currentSection === 'atividades' && (
              <div className="atividades-section">
                <h2>{currentAtividadesSubmenu === 'praticas-chaves' ? 'Práticas Chaves' : 'Eventos'}</h2>

                {currentAtividadesSubmenu === 'praticas-chaves' && (
                  <div className="praticas-container">
                    <div className="praticas-sidebar-only">
                      <div className="praticas-sidebar-header">
                        <h3>Práticas Chaves</h3>
                        <button
                          className="btn btn-primary btn-small"
                          onClick={() => setShowNovaParticaModal(true)}
                          title="Adicionar nova prática"
                        >
                          ➕
                        </button>
                      </div>
                      {loadingPraticas ? (
                        <div className="praticas-sidebar-loading">
                          <p>⏳ Carregando...</p>
                        </div>
                      ) : errorPraticas ? (
                        <div className="praticas-sidebar-error">
                          <p>❌ Erro ao carregar</p>
                        </div>
                      ) : praticasChaves.length > 0 ? (
                        <div className="praticas-sidebar-list">
                          {praticasChaves.map((pratica, index) => (
                            <button
                              key={pratica.id || `pratica-${index}`}
                              className={`pratica-sidebar-item ${selectedPraticaId === pratica.id ? 'active' : ''}`}
                              onClick={() => {
                                const normalizedPratica = normalizePratica(pratica)
                                console.log('📋 Prática selecionada (original):', pratica)
                                console.log('📋 Prática normalizada:', normalizedPratica)
                                console.log('📋 Todas as chaves:', Object.keys(normalizedPratica))
                                setSelectedPraticaId(normalizedPratica.id)
                                setSelectedPratica(normalizedPratica)
                              }}
                            >
                              <span className="pratica-sidebar-icon">{pratica.icone || '🎯'}</span>
                              <span className="pratica-sidebar-title">{pratica.titulo}</span>
                              <span className={`pratica-sidebar-status status-${pratica.status}`}>{pratica.status}</span>
                            </button>
                          ))}
                        </div>
                      ) : (
                        <div className="praticas-sidebar-empty">
                          <p>Nenhuma prática cadastrada</p>
                        </div>
                      )}
                    </div>

                    {selectedPratica && (
                      <div className="praticas-detail-panel">
                        <div className="detail-panel-header">
                          <h2>Visualizar Prática Chave</h2>
                          <button
                            className="detail-panel-close"
                            onClick={() => {
                              setSelectedPratica(null)
                              setSelectedPraticaId(null)
                            }}
                            title="Fechar painel"
                          >
                            ✕
                          </button>
                        </div>

                        <div className="detail-panel-body">
                          {/* Prática Chave */}
                          <div className="form-group">
                            <label htmlFor="view-pratica-chave">Prática Chave</label>
                            <input
                              id="view-pratica-chave"
                              type="text"
                              className="form-input"
                              value={selectedPratica.praticaChave || selectedPratica.titulo || ''}
                              disabled
                            />
                          </div>

                          {/* Objetivos */}
                          <div className="form-group">
                            <label htmlFor="view-objetivos">Objetivos</label>
                            <textarea
                              id="view-objetivos"
                              className="form-input form-textarea"
                              value={selectedPratica.objetivos || ''}
                              disabled
                              rows="3"
                            />
                          </div>

                          {/* Meio/Ação */}
                          <div className="form-group">
                            <label>Meio/Ação</label>
                            <div className="items-cards-list">
                              {selectedPratica.meioacoes && selectedPratica.meioacoes.length > 0 ? (
                                selectedPratica.meioacoes.map((item) => (
                                  <div key={item.id} className="item-card">
                                    <div className="item-card-content">
                                      <div style={{ marginBottom: '8px' }}>
                                        <strong style={{ color: 'var(--primary)' }}>Meio:</strong> {item.meio}
                                      </div>
                                      <div>
                                        <strong style={{ color: 'var(--primary)' }}>Ação:</strong><br/>
                                        {item.acao}
                                      </div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p style={{ color: '#999', fontSize: '13px' }}>Nenhum item adicionado</p>
                              )}
                            </div>
                          </div>

                          {/* Público Alvo */}
                          <div className="form-group">
                            <label htmlFor="view-publico-alvo">Público Alvo</label>
                            <input
                              id="view-publico-alvo"
                              type="text"
                              className="form-input"
                              value={selectedPratica.publicoAlvo || ''}
                              disabled
                            />
                          </div>

                          {/* Periodicidade */}
                          <div className="form-group">
                            <label>Periodicidade</label>
                            <div className="items-cards-list">
                              {selectedPratica.periodicidade && selectedPratica.periodicidade.length > 0 ? (
                                selectedPratica.periodicidade.map((item) => (
                                  <div key={item.id} className="item-card">
                                    <div className="item-card-content">
                                      {item.meioacao && (
                                        <div style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                                          <div style={{ marginBottom: '4px' }}>
                                            <strong style={{ color: 'var(--primary)', fontSize: '11px' }}>REFERÊNCIA:</strong>
                                          </div>
                                          <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                                            <strong>Meio:</strong> {item.meioacao.meio}
                                          </div>
                                          <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                                            <strong>Ação:</strong> {item.meioacao.acao.substring(0, 50)}...
                                          </div>
                                        </div>
                                      )}
                                      <div>
                                        <strong style={{ color: 'var(--primary)' }}>Periodicidade:</strong> {item.texto}
                                      </div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p style={{ color: '#999', fontSize: '13px' }}>Nenhum item adicionado</p>
                              )}
                            </div>
                          </div>

                          {/* Procedimento/Plano de Atividades */}
                          <div className="form-group">
                            <label>Procedimento/Plano de Atividades</label>
                            <div className="procedimentos-list">
                              {selectedPratica.procedimentos && selectedPratica.procedimentos.length > 0 ? (
                                selectedPratica.procedimentos.map((proc) => (
                                  <div key={proc.id} className="procedimento-item">
                                    <div className="procedimento-content">
                                      {proc.meioacao && (
                                        <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                                          <div style={{ marginBottom: '4px' }}>
                                            <strong style={{ color: 'var(--primary)', fontSize: '11px' }}>REFERÊNCIA - MEIO/AÇÃO:</strong>
                                          </div>
                                          <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                                            <strong>Meio:</strong> {proc.meioacao.meio}
                                          </div>
                                          <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                                            <strong>Ação:</strong> {proc.meioacao.acao.substring(0, 50)}...
                                          </div>
                                        </div>
                                      )}
                                      <div style={{ marginBottom: '8px' }}>
                                        <strong>Atividades:</strong><br/>
                                        <span style={{ fontSize: '12px' }}>{proc.atividades}</span>
                                      </div>
                                      {proc.responsavel && (
                                        <div style={{ marginBottom: '8px' }}>
                                          <strong>Responsável:</strong> {proc.responsavel}
                                        </div>
                                      )}
                                      {proc.quando && (
                                        <div>
                                          <strong>Quando:</strong> {proc.quando}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p style={{ color: '#999', fontSize: '13px' }}>Nenhum item adicionado</p>
                              )}
                            </div>
                          </div>

                          {/* Métricas */}
                          <div className="form-group">
                            <label>Métricas</label>
                            <div className="items-cards-list">
                              {selectedPratica.metricas && selectedPratica.metricas.length > 0 ? (
                                selectedPratica.metricas.map((item) => (
                                  <div key={item.id} className="item-card">
                                    <div className="item-card-content">
                                      <div style={{ marginBottom: '8px' }}>
                                        <strong style={{ color: 'var(--primary)' }}>{item.titulo}</strong>
                                      </div>
                                      <p style={{ margin: 0, fontSize: '12px', color: '#666' }}>{item.descricao}</p>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p style={{ color: '#999', fontSize: '13px' }}>Nenhum item adicionado</p>
                              )}
                            </div>
                          </div>

                          {/* Aprendizado */}
                          <div className="form-group">
                            <label htmlFor="view-aprendizado">Aprendizado</label>
                            <textarea
                              id="view-aprendizado"
                              className="form-input form-textarea"
                              value={selectedPratica.aprendizado || ''}
                              disabled
                              rows="3"
                            />
                          </div>

                          {/* Evidências */}
                          <div className="form-group">
                            <label>Evidências</label>
                            <div className="evidencias-list">
                              {selectedPratica.evidencias && selectedPratica.evidencias.length > 0 ? (
                                selectedPratica.evidencias.map((item) => (
                                  <div key={item.id} className="evidencia-item">
                                    <span>📎 {item.nome}</span>
                                  </div>
                                ))
                              ) : (
                                <p style={{ color: '#999', fontSize: '13px' }}>Nenhum item adicionado</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {currentAtividadesSubmenu === 'eventos' && (
                  <div className="eventos-container">
                    <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button
                        className="btn btn-primary"
                        onClick={handleOpenNovoEventoModal}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '12px 24px',
                          fontSize: '14px'
                        }}
                      >
                        <span>➕</span>
                        <span>Adicionar Evento</span>
                      </button>
                    </div>

                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: '400px',
                      backgroundColor: 'white',
                      borderRadius: '12px',
                      textAlign: 'center',
                      color: '#999'
                    }}>
                      <div>
                        <p style={{ fontSize: '48px', margin: '0 0 16px 0' }}>📅</p>
                        <p style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 8px 0' }}>Eventos</p>
                        <p style={{ fontSize: '14px', color: '#999' }}>Nenhum evento cadastrado</p>
                      </div>
                    </div>
                  </div>
                )}

              {showNovaParticaModal && (
                <div className="modal-overlay">
                  <div className="modal-content" style={{ maxWidth: '700px', maxHeight: '90vh' }}>
                    <div className="modal-header">
                      <h2>Adicionar Nova Prática Chave</h2>
                      <button
                        className="modal-close"
                        onClick={handleCancelNovaPartica}
                      >
                        ✕
                      </button>
                    </div>

                    <div className="modal-content-body">
                      {/* Prática Chave */}
                      <div className="form-group">
                        <label htmlFor="pratica-chave">Prática Chave *</label>
                        <input
                          id="pratica-chave"
                          type="text"
                          className="form-input"
                          placeholder="Digite a prática chave"
                          value={novaParticaForm.praticaChave}
                          onChange={(e) => setNovaParticaForm({
                            ...novaParticaForm,
                            praticaChave: e.target.value
                          })}
                        />
                      </div>

                      {/* Objetivos */}
                      <div className="form-group">
                        <label htmlFor="objetivos">Objetivos</label>
                        <textarea
                          id="objetivos"
                          className="form-input form-textarea"
                          placeholder="Descreva os objetivos da prática"
                          value={novaParticaForm.objetivos}
                          onChange={(e) => setNovaParticaForm({
                            ...novaParticaForm,
                            objetivos: e.target.value
                          })}
                          rows="3"
                        />
                      </div>

                      {/* Meio/Ação */}
                      <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label>Meio/Ação</label>
                          <button
                            className="btn btn-small btn-primary"
                            onClick={() => setShowMeioAcaoModal(true)}
                          >
                            ➕ Adicionar
                          </button>
                        </div>
                        <div className="items-cards-list">
                          {novaParticaForm.meioacoes.map((item) => (
                            <div key={item.id} className="item-card">
                              <div className="item-card-content">
                                <div style={{ marginBottom: '8px' }}>
                                  <strong style={{ color: 'var(--primary)' }}>Meio:</strong> {item.meio}
                                </div>
                                <div>
                                  <strong style={{ color: 'var(--primary)' }}>Ação:</strong><br/>
                                  {item.acao}
                                </div>
                              </div>
                              <button
                                className="item-card-remove"
                                onClick={() => handleRemoveMeioacoes(item.id)}
                                title="Remover"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Público Alvo */}
                      <div className="form-group">
                        <label htmlFor="publico-alvo">Público Alvo</label>
                        <input
                          id="publico-alvo"
                          type="text"
                          className="form-input"
                          placeholder="Descreva o público alvo"
                          value={novaParticaForm.publicoAlvo}
                          onChange={(e) => setNovaParticaForm({
                            ...novaParticaForm,
                            publicoAlvo: e.target.value
                          })}
                        />
                      </div>

                      {/* Periodicidade */}
                      <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label>Periodicidade</label>
                          <button
                            className="btn btn-small btn-primary"
                            onClick={() => setShowPeriodicidadeModal(true)}
                          >
                            ➕ Adicionar
                          </button>
                        </div>
                        <div className="items-cards-list">
                          {novaParticaForm.periodicidade.map((item) => (
                            <div key={item.id} className="item-card">
                              <div className="item-card-content">
                                {item.meioacao && (
                                  <div style={{ marginBottom: '10px', paddingBottom: '10px', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                                    <div style={{ marginBottom: '4px' }}>
                                      <strong style={{ color: 'var(--primary)', fontSize: '11px' }}>REFERÊNCIA:</strong>
                                    </div>
                                    <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                                      <strong>Meio:</strong> {item.meioacao.meio}
                                    </div>
                                    <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                                      <strong>Ação:</strong> {item.meioacao.acao.substring(0, 50)}...
                                    </div>
                                  </div>
                                )}
                                <div>
                                  <strong style={{ color: 'var(--primary)' }}>Periodicidade:</strong> {item.texto}
                                </div>
                              </div>
                              <button
                                className="item-card-remove"
                                onClick={() => handleRemovePeriodicidade(item.id)}
                                title="Remover"
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Procedimento/Plano de Atividades */}
                      <div className="form-group">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <label>Procedimento/Plano de Atividades</label>
                          <button
                            className="btn btn-small btn-primary"
                            onClick={() => setShowProcedimentoModal(true)}
                          >
                            ➕ Adicionar
                          </button>
                        </div>
                        <div className="procedimentos-list">
                          {novaParticaForm.procedimentos.map((proc) => (
                            <div key={proc.id} className="procedimento-item">
                              <div className="procedimento-content">
                                {proc.meioacao && (
                                  <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
                                    <div style={{ marginBottom: '4px' }}>
                                      <strong style={{ color: 'var(--primary)', fontSize: '11px' }}>REFERÊNCIA - MEIO/AÇÃO:</strong>
                                    </div>
                                    <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                                      <strong>Meio:</strong> {proc.meioacao.meio}
                                    </div>
                                    <div style={{ fontSize: '11px', lineHeight: '1.4' }}>
                                      <strong>Ação:</strong> {proc.meioacao.acao.substring(0, 50)}...
                                    </div>
                                  </div>
                                )}
                                <div style={{ marginBottom: '8px' }}>
                                  <strong>Atividades:</strong><br/>
                                  <span style={{ fontSize: '12px' }}>{proc.atividades}</span>
                                </div>
                                {proc.responsavel && (
                                  <div style={{ marginBottom: '8px' }}>
                                    <strong>Responsável:</strong> {proc.responsavel}
                                  </div>
                                )}
                                {proc.quando && (
                                  <div>
                                    <strong>Quando:</strong> {proc.quando}
                                  </div>
                                )}
                              </div>
                              <button
                                className="btn-remove-item"
                                onClick={() => handleRemoveProcedimento(proc.id)}
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Métricas */}
                      <div className="form-group">
                        <label>Métricas</label>
                        <button
                          className="btn btn-small btn-primary"
                          onClick={() => setShowNovaMetricaModal(true)}
                        >
                          ➕ Adicionar Métrica
                        </button>
                        <div className="items-cards-list">
                          {novaParticaForm.metricas.map((item) => (
                            <div key={item.id} className="item-card">
                              <h4 style={{ margin: '0 0 8px 0', color: 'var(--primary)' }}>{item.titulo}</h4>
                              <p style={{ margin: '0', fontSize: '12px', lineHeight: '1.4' }}>{item.descricao}</p>
                              <button
                                className="tag-remove"
                                onClick={() => handleRemoveMetrica(item.id)}
                                style={{ position: 'absolute', top: '10px', right: '10px' }}
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Aprendizado */}
                      <div className="form-group">
                        <label htmlFor="aprendizado">Aprendizado</label>
                        <textarea
                          id="aprendizado"
                          className="form-input form-textarea"
                          placeholder="Descreva os aprendizados"
                          value={novaParticaForm.aprendizado}
                          onChange={(e) => setNovaParticaForm({
                            ...novaParticaForm,
                            aprendizado: e.target.value
                          })}
                          rows="3"
                        />
                      </div>

                      {/* Evidências */}
                      <div className="form-group">
                        <label>Evidências</label>
                        <div className="evidencia-input">
                          <input
                            type="text"
                            className="form-input"
                            placeholder="Nome da evidência"
                            value={novaEvidencia.nome}
                            onChange={(e) => setNovaEvidencia({
                              ...novaEvidencia,
                              nome: e.target.value
                            })}
                          />
                          <input
                            type="file"
                            className="form-input"
                            onChange={(e) => setNovaEvidencia({
                              ...novaEvidencia,
                              arquivo: e.target.files?.[0]
                            })}
                          />
                          <button
                            className="btn btn-small btn-primary"
                            onClick={handleAddEvidencia}
                          >
                            ➕
                          </button>
                        </div>
                        <div className="evidencias-list">
                          {novaParticaForm.evidencias.map((item) => (
                            <div key={item.id} className="evidencia-item">
                              <span>📎 {item.nome}</span>
                              <button
                                className="btn-remove-item"
                                onClick={() => handleRemoveEvidencia(item.id)}
                              >
                                ✕
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="modal-footer">
                      <button
                        className="btn btn-secondary"
                        onClick={handleCancelNovaPartica}
                      >
                        Cancelar
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={handleAddNovaPartica}
                      >
                        Adicionar Prática
                      </button>
                    </div>
                  </div>

                  {/* Sub-modal para Procedimento/Plano de Atividades */}
                  {showProcedimentoModal && (
                    <div className="modal-overlay modal-overlay-nested">
                      <div className="modal-content" style={{ maxWidth: '550px' }}>
                        <div className="modal-header">
                          <h3>Adicionar Procedimento/Plano de Atividades</h3>
                          <button
                            className="modal-close"
                            onClick={() => setShowProcedimentoModal(false)}
                          >
                            ✕
                          </button>
                        </div>

                        <div className="modal-content-body">
                          {novaParticaForm.meioacoes.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text)', opacity: 0.7 }}>
                              <p>⚠️ Você precisa adicionar pelo menos um Meio/Ação primeiro</p>
                            </div>
                          ) : (
                            <>
                              <div className="form-group">
                                <label htmlFor="proc-meioacao-select">Selecione Meio/Ação *</label>
                                <select
                                  id="proc-meioacao-select"
                                  className="form-input"
                                  value={novaProcedimento.meioacaoId}
                                  onChange={(e) => setNovaProcedimento({
                                    ...novaProcedimento,
                                    meioacaoId: e.target.value
                                  })}
                                >
                                  <option value="">-- Selecione um Meio/Ação --</option>
                                  {novaParticaForm.meioacoes.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.meio} - {item.acao.substring(0, 30)}...
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {novaProcedimento.meioacaoId && (
                                <div style={{ padding: '15px', backgroundColor: 'var(--light)', borderRadius: '8px', marginBottom: '16px', borderLeft: '4px solid var(--primary-light)' }}>
                                  <h4 style={{ margin: '0 0 10px 0', color: 'var(--primary)', fontSize: '14px' }}>Referência - Meio/Ação Selecionado:</h4>
                                  {novaParticaForm.meioacoes.find(m => m.id == novaProcedimento.meioacaoId) && (
                                    <>
                                      <p style={{ margin: '0 0 8px 0', fontSize: '12px' }}>
                                        <strong style={{ color: 'var(--primary)' }}>Meio:</strong> {novaParticaForm.meioacoes.find(m => m.id == novaProcedimento.meioacaoId).meio}
                                      </p>
                                      <p style={{ margin: '0', fontSize: '12px', lineHeight: '1.4' }}>
                                        <strong style={{ color: 'var(--primary)' }}>Ação:</strong> {novaParticaForm.meioacoes.find(m => m.id == novaProcedimento.meioacaoId).acao}
                                      </p>
                                    </>
                                  )}
                                </div>
                              )}

                              <div className="form-group">
                                <label htmlFor="proc-atividades">Atividades *</label>
                                <textarea
                                  id="proc-atividades"
                                  className="form-input form-textarea"
                                  placeholder="Descreva as atividades"
                                  value={novaProcedimento.atividades}
                                  onChange={(e) => setNovaProcedimento({
                                    ...novaProcedimento,
                                    atividades: e.target.value
                                  })}
                                  rows="3"
                                />
                              </div>

                              <div className="form-group">
                                <label htmlFor="proc-responsavel">Responsável</label>
                                <input
                                  id="proc-responsavel"
                                  type="text"
                                  className="form-input"
                                  placeholder="Nome do responsável"
                                  value={novaProcedimento.responsavel}
                                  onChange={(e) => setNovaProcedimento({
                                    ...novaProcedimento,
                                    responsavel: e.target.value
                                  })}
                                />
                              </div>

                              <div className="form-group">
                                <label htmlFor="proc-quando">Quando</label>
                                <input
                                  id="proc-quando"
                                  type="text"
                                  className="form-input"
                                  placeholder="Data ou período"
                                  value={novaProcedimento.quando}
                                  onChange={(e) => setNovaProcedimento({
                                    ...novaProcedimento,
                                    quando: e.target.value
                                  })}
                                />
                              </div>
                            </>
                          )}
                        </div>

                        <div className="modal-footer">
                          <button
                            className="btn btn-secondary"
                            onClick={() => setShowProcedimentoModal(false)}
                          >
                            Cancelar
                          </button>
                          <button
                            className="btn btn-primary"
                            disabled={novaParticaForm.meioacoes.length === 0}
                            onClick={handleAddProcedimento}
                          >
                            Adicionar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sub-modal para Meio/Ação */}
                  {showMeioAcaoModal && (
                    <div className="modal-overlay modal-overlay-nested">
                      <div className="modal-content" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                          <h3>Adicionar Meio/Ação</h3>
                          <button
                            className="modal-close"
                            onClick={() => {
                              setShowMeioAcaoModal(false)
                              setNovaMeioacao({ meio: '', acao: '' })
                            }}
                          >
                            ✕
                          </button>
                        </div>

                        <div className="modal-content-body">
                          <div className="form-group">
                            <label htmlFor="meio-input">Meio *</label>
                            <input
                              id="meio-input"
                              type="text"
                              className="form-input"
                              placeholder="Digite o meio"
                              value={novaMeioacao.meio}
                              onChange={(e) => setNovaMeioacao({
                                ...novaMeioacao,
                                meio: e.target.value
                              })}
                            />
                          </div>

                          <div className="form-group">
                            <label htmlFor="acao-input">Ação *</label>
                            <textarea
                              id="acao-input"
                              className="form-input form-textarea"
                              placeholder="Digite a ação"
                              value={novaMeioacao.acao}
                              onChange={(e) => setNovaMeioacao({
                                ...novaMeioacao,
                                acao: e.target.value
                              })}
                              rows="4"
                            />
                          </div>
                        </div>

                        <div className="modal-footer">
                          <button
                            className="btn btn-secondary"
                            onClick={() => {
                              setShowMeioAcaoModal(false)
                              setNovaMeioacao({ meio: '', acao: '' })
                            }}
                          >
                            Cancelar
                          </button>
                          <button
                            className="btn btn-primary"
                            onClick={() => {
                              handleAddMeioacoes()
                              setShowMeioAcaoModal(false)
                            }}
                          >
                            Adicionar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sub-modal para Periodicidade */}
                  {showPeriodicidadeModal && (
                    <div className="modal-overlay modal-overlay-nested">
                      <div className="modal-content" style={{ maxWidth: '550px' }}>
                        <div className="modal-header">
                          <h3>Adicionar Periodicidade</h3>
                          <button
                            className="modal-close"
                            onClick={() => {
                              setShowPeriodicidadeModal(false)
                              setNovaPeriodicidade({ meioacaoId: '', periodicidade: '' })
                            }}
                          >
                            ✕
                          </button>
                        </div>

                        <div className="modal-content-body">
                          {novaParticaForm.meioacoes.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '30px 20px', color: 'var(--text)', opacity: 0.7 }}>
                              <p>⚠️ Você precisa adicionar pelo menos um Meio/Ação primeiro</p>
                            </div>
                          ) : (
                            <>
                              <div className="form-group">
                                <label htmlFor="meioacao-select">Selecione Meio/Ação *</label>
                                <select
                                  id="meioacao-select"
                                  className="form-input"
                                  value={novaPeriodicidade.meioacaoId}
                                  onChange={(e) => setNovaPeriodicidade({
                                    ...novaPeriodicidade,
                                    meioacaoId: e.target.value
                                  })}
                                >
                                  <option value="">-- Selecione um Meio/Ação --</option>
                                  {novaParticaForm.meioacoes.map((item) => (
                                    <option key={item.id} value={item.id}>
                                      {item.meio} - {item.acao.substring(0, 30)}...
                                    </option>
                                  ))}
                                </select>
                              </div>

                              {novaPeriodicidade.meioacaoId && (
                                <div style={{ padding: '15px', backgroundColor: 'var(--light)', borderRadius: '8px', marginBottom: '16px', borderLeft: '4px solid var(--primary-light)' }}>
                                  <h4 style={{ margin: '0 0 10px 0', color: 'var(--primary)', fontSize: '14px' }}>Referência - Meio/Ação Selecionado:</h4>
                                  {novaParticaForm.meioacoes.find(m => m.id == novaPeriodicidade.meioacaoId) && (
                                    <>
                                      <p style={{ margin: '0 0 8px 0', fontSize: '12px' }}>
                                        <strong style={{ color: 'var(--primary)' }}>Meio:</strong> {novaParticaForm.meioacoes.find(m => m.id == novaPeriodicidade.meioacaoId).meio}
                                      </p>
                                      <p style={{ margin: '0', fontSize: '12px', lineHeight: '1.4' }}>
                                        <strong style={{ color: 'var(--primary)' }}>Ação:</strong> {novaParticaForm.meioacoes.find(m => m.id == novaPeriodicidade.meioacaoId).acao}
                                      </p>
                                    </>
                                  )}
                                </div>
                              )}

                              <div className="form-group">
                                <label htmlFor="periodicidade-input">Periodicidade *</label>
                                <input
                                  id="periodicidade-input"
                                  type="text"
                                  className="form-input"
                                  placeholder="Ex: Semanal, Mensal, Trimestral, Anual"
                                  value={novaPeriodicidade.periodicidade}
                                  onChange={(e) => setNovaPeriodicidade({
                                    ...novaPeriodicidade,
                                    periodicidade: e.target.value
                                  })}
                                />
                              </div>
                            </>
                          )}
                        </div>

                        <div className="modal-footer">
                          <button
                            className="btn btn-secondary"
                            onClick={() => {
                              setShowPeriodicidadeModal(false)
                              setNovaPeriodicidade({ meioacaoId: '', periodicidade: '' })
                            }}
                          >
                            Cancelar
                          </button>
                          <button
                            className="btn btn-primary"
                            disabled={novaParticaForm.meioacoes.length === 0}
                            onClick={() => {
                              handleAddPeriodicidade()
                              setShowPeriodicidadeModal(false)
                            }}
                          >
                            Adicionar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Sub-modal para Métricas */}
                  {showNovaMetricaModal && (
                    <div className="modal-overlay modal-overlay-nested">
                      <div className="modal-content" style={{ maxWidth: '500px' }}>
                        <div className="modal-header">
                          <h3>Adicionar Métrica</h3>
                          <button
                            className="modal-close"
                            onClick={() => {
                              setShowNovaMetricaModal(false)
                              setNovaMetrica({ titulo: '', descricao: '' })
                            }}
                          >
                            ✕
                          </button>
                        </div>

                        <div className="modal-content-body">
                          <div className="form-group">
                            <label htmlFor="metrica-titulo">Título *</label>
                            <input
                              id="metrica-titulo"
                              type="text"
                              className="form-input"
                              placeholder="Digite o título da métrica"
                              value={novaMetrica.titulo}
                              onChange={(e) => setNovaMetrica({
                                ...novaMetrica,
                                titulo: e.target.value
                              })}
                            />
                          </div>

                          <div className="form-group">
                            <label htmlFor="metrica-descricao">Descrição *</label>
                            <textarea
                              id="metrica-descricao"
                              className="form-input form-textarea"
                              placeholder="Descreva a métrica"
                              value={novaMetrica.descricao}
                              onChange={(e) => setNovaMetrica({
                                ...novaMetrica,
                                descricao: e.target.value
                              })}
                              rows="4"
                            />
                          </div>
                        </div>

                        <div className="modal-footer">
                          <button
                            className="btn btn-secondary"
                            onClick={() => {
                              setShowNovaMetricaModal(false)
                              setNovaMetrica({ titulo: '', descricao: '' })
                            }}
                          >
                            Cancelar
                          </button>
                          <button
                            className="btn btn-primary"
                            onClick={handleAddMetrica}
                          >
                            Adicionar
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {showNovoEventoModal && (
                <div className="modal-overlay">
                  <div className="modal-content" style={{ maxWidth: '1024px', maxHeight: '85vh' }}>
                    <div className="modal-header">
                      <h2>Adicionar Novo Evento</h2>
                      <button
                        className="modal-close"
                        onClick={handleCancelNovoEvento}
                      >
                        ✕
                      </button>
                    </div>

                    <div className="modal-content-body" style={{ maxHeight: 'calc(85vh - 150px)', overflowY: 'auto' }}>
                      {loadingEventoPraticas && eventoPraticasChaves.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text)' }}>
                          <p>Carregando práticas chaves...</p>
                        </div>
                      ) : (
                        <>
                          {/* Seletor de Prática Chave */}
                          <div className="form-group">
                            <label htmlFor="evento-pratica-select">Selecione uma Prática Chave *</label>
                            <select
                              id="evento-pratica-select"
                              className="form-input"
                              value={novoEvento.praticaChaveId}
                              onChange={(e) => setNovoEvento({
                                ...novoEvento,
                                praticaChaveId: e.target.value
                              })}
                            >
                              <option value="">-- Selecione uma prática chave --</option>
                              {eventoPraticasChaves.map((pratica) => (
                                <option key={pratica.id} value={pratica.id}>
                                  {pratica.icone} {pratica.titulo}
                                </option>
                              ))}
                            </select>
                          </div>

                          {/* Título do Evento */}
                          <div className="form-group">
                            <label htmlFor="evento-titulo">Título do Evento</label>
                            <input
                              id="evento-titulo"
                              type="text"
                              className="form-input"
                              placeholder="Digite o título do evento"
                              value={novoEvento.titulo}
                              onChange={(e) => setNovoEvento({
                                ...novoEvento,
                                titulo: e.target.value
                              })}
                            />
                          </div>

                          {/* Descrição do Evento */}
                          <div className="form-group">
                            <label htmlFor="evento-descricao">Descrição</label>
                            <textarea
                              id="evento-descricao"
                              className="form-input form-textarea"
                              placeholder="Digite a descrição do evento"
                              value={novoEvento.descricao}
                              onChange={(e) => setNovoEvento({
                                ...novoEvento,
                                descricao: e.target.value
                              })}
                              rows="4"
                            />
                          </div>

                          {/* Campos Dinâmicos - Aparecem quando prática é selecionada */}
                          {novoEvento.praticaChaveId && (() => {
                            const practicaSelecionada = eventoPraticasChaves.find(p => String(p.id) === String(novoEvento.praticaChaveId))

                            if (!practicaSelecionada) return null

                            console.log('🎯 Prática Selecionada:', practicaSelecionada)
                            console.log('📋 Meioacoes:', practicaSelecionada.meioacoes)
                            console.log('📋 Metricas:', practicaSelecionada.metricas)
                            console.log('📋 Todas as chaves da prática:', Object.keys(practicaSelecionada))
                            console.log('📋 Estrutura completa:', JSON.stringify(practicaSelecionada, null, 2))

                            return (
                              <>
                                {/* Informações da Prática Selecionada */}
                                <div style={{
                                  padding: '15px',
                                  backgroundColor: 'var(--light)',
                                  borderRadius: '8px',
                                  marginBottom: '20px',
                                  borderLeft: '4px solid var(--primary-light)'
                                }}>
                                  <h4 style={{ margin: '0 0 10px 0', color: 'var(--primary)', fontSize: '14px' }}>
                                    Prática Selecionada:
                                  </h4>
                                  <p style={{ margin: '0 0 8px 0', fontSize: '14px' }}>
                                    <strong>Nome:</strong> {practicaSelecionada.titulo}
                                  </p>
                                  <p style={{ margin: '0 0 8px 0', fontSize: '13px', color: '#666', lineHeight: '1.4' }}>
                                    <strong>Descrição:</strong> {practicaSelecionada.praticaChave || 'N/A'}
                                  </p>
                                  <p style={{ margin: '0', fontSize: '12px', color: '#999' }}>
                                    <strong>Meio/Ações:</strong> {practicaSelecionada.meioacoes?.length || 0} |
                                    <strong> Métricas:</strong> {practicaSelecionada.metricas?.length || 0}
                                  </p>
                                </div>

                                {/* Objetivos */}
                                <div className="form-group">
                                  <label htmlFor="evento-objetivos">Objetivos</label>
                                  <textarea
                                    id="evento-objetivos"
                                    className="form-input form-textarea"
                                    placeholder="Digite os objetivos do evento"
                                    value={novoEvento.objetivos}
                                    onChange={(e) => setNovoEvento({
                                      ...novoEvento,
                                      objetivos: e.target.value
                                    })}
                                    rows="3"
                                  />
                                </div>

                                {/* Meio/Ação - Inputs dinâmicos */}
                                <div className="form-group">
                                  <label>🔧 Meio/Ação</label>
                                  {practicaSelecionada.meioacoes && practicaSelecionada.meioacoes.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                      {practicaSelecionada.meioacoes.map((meio) => (
                                        <div key={meio.id} style={{
                                          padding: '12px',
                                          backgroundColor: '#f9fafb',
                                          borderRadius: '8px',
                                          borderLeft: '3px solid var(--primary-light)'
                                        }}>
                                          <label style={{ fontSize: '13px', color: 'var(--primary)', marginBottom: '8px', display: 'block', fontWeight: '600' }}>
                                            {meio.meio}
                                          </label>
                                          <p style={{ fontSize: '12px', color: '#666', margin: '0 0 8px 0', lineHeight: '1.4' }}>
                                            <strong>Ação:</strong> {meio.acao}
                                          </p>
                                          <input
                                            type="text"
                                            className="form-input"
                                            placeholder={`Digite dados/resultado para: ${meio.meio}`}
                                            value={novoEvento.meioacoes[meio.id] || ''}
                                            onChange={(e) => setNovoEvento({
                                              ...novoEvento,
                                              meioacoes: {
                                                ...novoEvento.meioacoes,
                                                [meio.id]: e.target.value
                                              }
                                            })}
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div style={{
                                      padding: '16px',
                                      backgroundColor: '#fef3c7',
                                      borderRadius: '8px',
                                      borderLeft: '3px solid var(--warning)',
                                      fontSize: '13px',
                                      color: '#92400e'
                                    }}>
                                      ⚠️ Nenhum Meio/Ação cadastrado para esta prática
                                    </div>
                                  )}
                                </div>

                                {/* Público Alvo */}
                                <div className="form-group">
                                  <label htmlFor="evento-publico-alvo">Público Alvo</label>
                                  <input
                                    id="evento-publico-alvo"
                                    type="text"
                                    className="form-input"
                                    placeholder="Digite o público alvo"
                                    value={novoEvento.publicoAlvo}
                                    onChange={(e) => setNovoEvento({
                                      ...novoEvento,
                                      publicoAlvo: e.target.value
                                    })}
                                  />
                                </div>

                                {/* Periodicidade */}
                                <div className="form-group">
                                  <label htmlFor="evento-periodicidade">Periodicidade</label>
                                  <input
                                    id="evento-periodicidade"
                                    type="text"
                                    className="form-input"
                                    placeholder="Ex: Mensalmente, Semanalmente, etc"
                                    value={novoEvento.periodicidade}
                                    onChange={(e) => setNovoEvento({
                                      ...novoEvento,
                                      periodicidade: e.target.value
                                    })}
                                  />
                                </div>

                                {/* Métricas - Inputs dinâmicos */}
                                <div className="form-group">
                                  <label>📊 Métricas</label>
                                  {practicaSelecionada.metricas && practicaSelecionada.metricas.length > 0 ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                      {practicaSelecionada.metricas.map((metrica) => (
                                        <div key={metrica.id} style={{
                                          padding: '12px',
                                          backgroundColor: '#f9fafb',
                                          borderRadius: '8px',
                                          borderLeft: '3px solid var(--accent)'
                                        }}>
                                          <label style={{ fontSize: '13px', color: 'var(--primary)', marginBottom: '8px', display: 'block', fontWeight: '600' }}>
                                            {metrica.titulo}
                                          </label>
                                          {metrica.descricao && (
                                            <p style={{ fontSize: '12px', color: '#666', margin: '0 0 8px 0', lineHeight: '1.4' }}>
                                              {metrica.descricao}
                                            </p>
                                          )}
                                          <input
                                            type="text"
                                            className="form-input"
                                            placeholder={`Digite o valor/resultado para: ${metrica.titulo}`}
                                            value={novoEvento.metricas[metrica.id] || ''}
                                            onChange={(e) => setNovoEvento({
                                              ...novoEvento,
                                              metricas: {
                                                ...novoEvento.metricas,
                                                [metrica.id]: e.target.value
                                              }
                                            })}
                                          />
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div style={{
                                      padding: '16px',
                                      backgroundColor: '#fef3c7',
                                      borderRadius: '8px',
                                      borderLeft: '3px solid var(--warning)',
                                      fontSize: '13px',
                                      color: '#92400e'
                                    }}>
                                      ⚠️ Nenhuma Métrica cadastrada para esta prática
                                    </div>
                                  )}
                                </div>

                                {/* Aprendizado */}
                                <div className="form-group">
                                  <label htmlFor="evento-aprendizado">Aprendizado</label>
                                  <textarea
                                    id="evento-aprendizado"
                                    className="form-input form-textarea"
                                    placeholder="Digite os aprendizados obtidos"
                                    value={novoEvento.aprendizado}
                                    onChange={(e) => setNovoEvento({
                                      ...novoEvento,
                                      aprendizado: e.target.value
                                    })}
                                    rows="3"
                                  />
                                </div>

                                {/* Upload de Evidências */}
                                <div className="form-group">
                                  <label htmlFor="evento-evidencias">Evidências (Arquivos)</label>
                                  <div style={{
                                    padding: '20px',
                                    border: '2px dashed var(--border)',
                                    borderRadius: '8px',
                                    textAlign: 'center',
                                    cursor: 'pointer',
                                    transition: 'all 0.3s',
                                    backgroundColor: 'var(--light)'
                                  }}
                                    onDragOver={(e) => {
                                      e.preventDefault()
                                      e.currentTarget.style.backgroundColor = 'rgba(59, 130, 246, 0.1)'
                                      e.currentTarget.style.borderColor = 'var(--primary-light)'
                                    }}
                                    onDragLeave={(e) => {
                                      e.currentTarget.style.backgroundColor = 'var(--light)'
                                      e.currentTarget.style.borderColor = 'var(--border)'
                                    }}
                                    onDrop={(e) => {
                                      e.preventDefault()
                                      e.currentTarget.style.backgroundColor = 'var(--light)'
                                      const files = Array.from(e.dataTransfer.files)
                                      setNovoEvento({
                                        ...novoEvento,
                                        evidencias: [...novoEvento.evidencias, ...files]
                                      })
                                    }}
                                  >
                                    <input
                                      id="evento-evidencias"
                                      type="file"
                                      multiple
                                      style={{ display: 'none' }}
                                      onChange={(e) => {
                                        const files = Array.from(e.target.files)
                                        setNovoEvento({
                                          ...novoEvento,
                                          evidencias: [...novoEvento.evidencias, ...files]
                                        })
                                      }}
                                    />
                                    <label htmlFor="evento-evidencias" style={{ cursor: 'pointer', margin: 0 }}>
                                      <p style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '600', color: 'var(--primary)' }}>
                                        📎 Clique ou arraste arquivos aqui
                                      </p>
                                      <p style={{ margin: '0', fontSize: '12px', color: '#999' }}>
                                        Formatos suportados: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG
                                      </p>
                                    </label>
                                  </div>

                                  {/* Lista de Arquivos Selecionados */}
                                  {novoEvento.evidencias.length > 0 && (
                                    <div style={{ marginTop: '12px' }}>
                                      <p style={{ margin: '0 0 8px 0', fontSize: '13px', fontWeight: '600', color: 'var(--primary)' }}>
                                        Arquivos selecionados ({novoEvento.evidencias.length}):
                                      </p>
                                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                        {novoEvento.evidencias.map((file, idx) => (
                                          <div key={idx} style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: '10px 12px',
                                            backgroundColor: '#f0fdf4',
                                            borderRadius: '6px',
                                            borderLeft: '3px solid var(--accent)'
                                          }}>
                                            <span style={{ fontSize: '13px', color: 'var(--text)' }}>
                                              📄 {file.name}
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => setNovoEvento({
                                                ...novoEvento,
                                                evidencias: novoEvento.evidencias.filter((_, i) => i !== idx)
                                              })}
                                              style={{
                                                background: 'none',
                                                border: 'none',
                                                color: 'var(--danger)',
                                                cursor: 'pointer',
                                                fontSize: '16px',
                                                padding: 0
                                              }}
                                              title="Remover"
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </>
                            )
                          })()}
                        </>
                      )}
                    </div>

                    <div className="modal-footer">
                      <button
                        className="btn btn-secondary"
                        onClick={handleCancelNovoEvento}
                      >
                        Cancelar
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={handleCreateEvento}
                        disabled={loadingEventoPraticas}
                      >
                        {loadingEventoPraticas ? 'Criando...' : 'Criar Evento'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal de Visualização do JSON do Evento */}
              {showEventoJsonModal && (
                <div className="modal-overlay">
                  <div className="modal" style={{ maxWidth: '700px', maxHeight: '85vh' }}>
                    <div className="modal-header">
                      <h3>📋 Prévia do Evento</h3>
                      <button
                        className="modal-close"
                        onClick={() => setShowEventoJsonModal(false)}
                      >
                        ✕
                      </button>
                    </div>

                    <div className="modal-content-body" style={{ maxHeight: 'calc(85vh - 150px)', overflowY: 'auto', padding: '20px' }}>
                      <div style={{
                        backgroundColor: '#f5f5f5',
                        border: '1px solid #ddd',
                        borderRadius: '6px',
                        padding: '15px',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        lineHeight: '1.6',
                        color: '#333',
                        overflowX: 'auto',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-word'
                      }}>
                        {JSON.stringify(eventoJsonOutput, null, 2)}
                      </div>

                      <div style={{
                        marginTop: '20px',
                        padding: '15px',
                        backgroundColor: '#e7f3ff',
                        border: '1px solid #b3d9ff',
                        borderRadius: '6px',
                        color: '#004085',
                        fontSize: '13px',
                        lineHeight: '1.5'
                      }}>
                        <p style={{ margin: '0 0 10px 0' }}>
                          <strong>ℹ️ Revise os dados antes de confirmar:</strong>
                        </p>
                        <ul style={{ margin: '0', paddingLeft: '20px' }}>
                          <li>Prática Chave: <strong>{eventoJsonOutput?.practicaChaveNome}</strong></li>
                          <li>Título: <strong>{eventoJsonOutput?.titulo}</strong></li>
                          <li>Meio/Ações preenchidos: <strong>{Object.keys(eventoJsonOutput?.meioacoes || {}).length}</strong></li>
                          <li>Métricas preenchidas: <strong>{Object.keys(eventoJsonOutput?.metricas || {}).length}</strong></li>
                          <li>Evidências anexadas: <strong>{eventoJsonOutput?.evidencias?.length || 0}</strong></li>
                        </ul>
                      </div>
                    </div>

                    <div className="modal-footer">
                      <button
                        className="btn btn-secondary"
                        onClick={() => setShowEventoJsonModal(false)}
                      >
                        Voltar
                      </button>
                      <button
                        className="btn btn-primary"
                        onClick={handleConfirmEventoJson}
                        disabled={loadingEventoPraticas}
                      >
                        {loadingEventoPraticas ? 'Criando...' : 'Confirmar e Criar Evento'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
              </div>
            )}

            {isConsultor && currentSection === 'gerenciar-projetos' && (
              <div className="aprovar-section">
                <h2>Gerenciar Projetos</h2>
                <div className="recent-section">
                  <h3>
                {currentSubmenu === 'gerenciar' && 'Planos de Negócios Pendentes de Aprovação'}
                {currentSubmenu === 'aprovados' && 'Projetos Aprovados'}
                {currentSubmenu === 'rejeitados' && 'Projetos Rejeitados'}
              </h3>
              {loadingPendingPlans ? (
                <div className="loading-message">
                  <p>Carregando projetos...</p>
                </div>
              ) : currentSubmenu === 'gerenciar' && pendingPlans.length === 0 ? (
                    <table className="submissions-table">
                      <thead>
                        <tr>
                          <th>Empresa</th>
                          <th>Proponente</th>
                          <th>Email</th>
                          <th>Visualizar Plano</th>
                          <th>Status</th>
                          <th>Ações</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td colSpan="6" style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text)' }}>
                            ✓ Nenhum plano pendente de aprovação
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  ) : currentSubmenu === 'aprovados' ? (
                    <table className="submissions-table">
                      <thead>
                        <tr>
                          <th>Proponente</th>
                          <th>Empresa</th>
                          <th>Email</th>
                          <th>Visualizar Plano</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingPlans && pendingPlans.length > 0 ? (
                          pendingPlans.map((plan) => (
                            <tr key={plan.id}>
                              <td>{plan.is_incubado?.formData?.nomeProponente || 'N/A'}</td>
                              <td>{plan.is_incubado?.formData?.nomeNegocio || 'N/A'}</td>
                              <td>{typeof plan.questionario === 'string' ? plan.questionario : (plan.email || 'N/A')}</td>
                              <td>
                                <button className="action-btn view-btn" onClick={() => handleViewPlan(plan.is_incubado)}>📄 Visualizar</button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text)' }}>
                              📊 Nenhum projeto aprovado
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  ) : currentSubmenu === 'rejeitados' ? (
                    <table className="submissions-table">
                      <thead>
                        <tr>
                          <th>Proponente</th>
                          <th>Empresa</th>
                          <th>Email</th>
                          <th>Visualizar Plano</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pendingPlans && pendingPlans.length > 0 ? (
                          pendingPlans.map((plan) => (
                            <tr key={plan.id}>
                              <td>{plan.questionario?.formData?.nomeProponente || 'N/A'}</td>
                              <td>{plan.questionario?.formData?.nomeNegocio || 'N/A'}</td>
                              <td>{plan.email || 'N/A'}</td>
                              <td>
                                <button className="action-btn view-btn" onClick={() => handleViewPlan(plan.questionario)}>📄 Visualizar</button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="4" style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text)' }}>
                              📊 Nenhum projeto rejeitado
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  ) : (
                    <table className="submissions-table">
                        <thead>
                          <tr>
                            <th>Empresa</th>
                            <th>Proponente</th>
                            <th>Email</th>
                            <th>Visualizar Plano</th>
                            <th>Status</th>
                            <th>Ações</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pendingPlans.map((plan) => (
                            <tr key={plan.id}>
                              <td>{plan.questionario?.formData?.nomeNegocio || 'N/A'}</td>
                              <td>{plan.questionario?.formData?.nomeProponente || 'N/A'}</td>
                              <td>{plan.email || 'N/A'}</td>
                              <td>
                                <button className="action-btn view-btn" onClick={() => handleViewPlan(plan)}>📄 Visualizar</button>
                              </td>
                              <td><span className="status-badge status-pending">⏳ Pendente</span></td>
                              <td>
                                <button className="action-btn approve-btn" onClick={() => handleApprove(plan)}>Aprovar</button>
                                <button className="action-btn reject-btn" onClick={() => handleReject(plan)}>Rejeitar</button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  </div>
  </>
)
}

export default Dashboard
