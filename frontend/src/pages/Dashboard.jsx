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
    // Se tem um wrapper com pratica_chave, mesclar o wrapper com o conteúdo
    sourceData = {
      ...data,
      ...data.pratica_chave
    }
  }

  // Estrutura exata como jsonOutput no criar prática
  const normalized = {
    // Campos para identificação (sidebar + modal)
    id: getField(sourceData, 'id', '_id') || Date.now(),
    titulo: getField(sourceData, 'titulo', 'title', 'praticaChave', 'pratica_chave') || 'Sem título',
    icone: getField(sourceData, 'icone', 'icon') || '🎯',
    status: getField(sourceData, 'status') || 'ativo',

    // Estrutura exata do jsonOutput
    praticaChave: getField(sourceData, 'praticaChave', 'pratica_chave', 'titulo', 'title') || '',
    objetivos: getField(sourceData, 'objetivos', 'objectives', 'objetivo', 'goals') || '',
    publicoAlvo: getField(sourceData, 'publicoAlvo', 'publico_alvo', 'publicAlvo', 'target_audience', 'audience') || '',
    aprendizado: getField(sourceData, 'aprendizado', 'aprendizados', 'learning', 'lessons') || '',

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
  const [stats, setStats] = useState({
    totalUsers: 1250,
    pendingReviews: 23,
    completedForms: 824
  })
  const [praticasChaves, setPraticasChaves] = useState([])
  const [loadingPraticas, setLoadingPraticas] = useState(false)
  const [errorPraticas, setErrorPraticas] = useState(null)

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

        const isConsultorValue = response.data?.is_consultor === true
        const isIncubadoValue = response.data?.is_incubado !== false

        console.log('👨‍💼 is_consultor:', isConsultorValue)
        console.log('🏢 is_incubado:', isIncubadoValue)

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

                // Verificar se o compromisso já foi participado
                const isParticipated = !!(apt.incubado && apt.empresa)
                if (isParticipated) {
                  console.log(`⏸️ Compromisso ${aptIdx} já foi participado por: ${apt.incubado} (${apt.empresa})`)
                }

                // Transformar o compromisso do formato API para o formato interno
                const transformedAppointment = {
                  id: apt.id,
                  agendaId: agendaId,  // Adicionar ID da agenda para referência
                  title: apt.titulo,
                  description: apt.descricao || '',
                  responsible: apt.responsavel || '',
                  startDate: apt.dataInicio,
                  endDate: apt.dataFim,
                  startHour: apt.horaInicio ? apt.horaInicio.split(':')[0] : '00',
                  endHour: apt.horaFim ? apt.horaFim.split(':')[0] : '00',
                  isOpenAppointment: apt.ehCompromisoAberto || false,
                  consultorEmail: apt.consultorEmail,
                  incubado: apt.incubado || null,
                  empresa: apt.empresa || null,
                  dataParticipacao: apt.dataParticipacao || null,
                  isParticipated: isParticipated
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
      if (!selectedDateRangeStart) {
        // Primeira data do range
        setSelectedDateRangeStart(dateStr)
        setSelectedDate(dateStr)
      } else if (!selectedDateRangeEnd) {
        // Segunda data do range
        const start = new Date(selectedDateRangeStart)
        const end = new Date(dateStr)

        if (end < start) {
          // Se a segunda data é antes da primeira, inverte
          setSelectedDateRangeStart(dateStr)
          setSelectedDateRangeEnd(selectedDateRangeStart)
        } else {
          setSelectedDateRangeEnd(dateStr)
        }
        setSelectedDate(dateStr)
      } else {
        // Reset range
        setSelectedDateRangeStart(dateStr)
        setSelectedDateRangeEnd(null)
        setSelectedDate(dateStr)
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

  const checkTimeConflict = (startDate, endDate, startHour, endHour, isOpenAppointment) => {
    // Verificar se há conflito com compromissos do MESMO consultor
    for (const apt of appointments) {
      // Só verifica conflito com compromissos do mesmo consultor
      if (apt.consultorEmail !== user?.email) {
        continue
      }

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

    const startHour = parseInt(appointmentForm.startHour)
    const endHour = parseInt(appointmentForm.endHour)

    // Validar horários apenas se não for compromisso aberto
    if (!appointmentForm.isOpenAppointment && startHour >= endHour) {
      const errorMessage = `Horário Inválido!\n\nHora inicial: ${String(startHour).padStart(2, '0')}:00\nHora final: ${String(endHour).padStart(2, '0')}:00\n\nA hora de término deve ser maior que a hora de início.\nNão é possível realizar a marcação com estes horários.`
      setMessageModalType('error')
      setMessageModalContent(errorMessage)
      setShowMessageModal(true)
      console.error('❌ Erro ao agendar compromisso:', {
        startHour: `${String(startHour).padStart(2, '0')}:00`,
        endHour: `${String(endHour).padStart(2, '0')}:00`,
        message: 'Hora inicial é maior ou igual à hora final'
      })
      return
    }

    // Definir datas para o range (se for consultor com range selecionado)
    const appointmentStartDate = selectedDateRangeStart || selectedDate
    const appointmentEndDate = selectedDateRangeEnd || selectedDate

    // Verificar conflito de horários
    const appointmentStartHour = appointmentForm.isOpenAppointment ? '00' : appointmentForm.startHour
    const appointmentEndHour = appointmentForm.isOpenAppointment ? '23' : appointmentForm.endHour

    if (checkTimeConflict(appointmentStartDate, appointmentEndDate, appointmentStartHour, appointmentEndHour, appointmentForm.isOpenAppointment)) {
      const errorMessage = `Conflito de Horário!\n\nJá existe um compromisso seu agendado para este período.\n\nPeriodo: ${appointmentStartDate}${appointmentEndDate !== appointmentStartDate ? ` até ${appointmentEndDate}` : ''}\nHorário: ${String(appointmentStartHour).padStart(2, '0')}:00 às ${String(appointmentEndHour).padStart(2, '0')}:00\n\nNão é possível agendar dois compromissos seu no mesmo horário.`
      setMessageModalType('error')
      setMessageModalContent(errorMessage)
      setShowMessageModal(true)
      console.error('❌ Conflito de horário ao agendar compromisso:', {
        consultorEmail: user?.email,
        startDate: appointmentStartDate,
        endDate: appointmentEndDate,
        startHour: `${String(appointmentStartHour).padStart(2, '0')}:00`,
        endHour: `${String(appointmentEndHour).padStart(2, '0')}:00`,
        message: 'Ja existe compromisso neste período para este consultor'
      })
      return
    }

    const newAppointment = {
      id: Date.now(),
      startDate: appointmentStartDate,
      endDate: appointmentEndDate,
      startHour: appointmentForm.isOpenAppointment ? '00' : appointmentForm.startHour,
      endHour: appointmentForm.isOpenAppointment ? '23' : appointmentForm.endHour,
      isOpenAppointment: appointmentForm.isOpenAppointment,
      consultorEmail: user?.email,
      consultorId: user?.id,
      ...appointmentForm
    }

    console.log('📅 Novo Compromisso Agendado por:', user?.email)
    console.log('📋 Detalhes:', JSON.stringify(newAppointment, null, 2))

    // Criar objeto de compromisso formatado (apenas o novo)
    const novoCompromisso = {
      id: newAppointment.id,
      titulo: newAppointment.title,
      descricao: newAppointment.description || '',
      responsavel: newAppointment.responsible || '',
      dataInicio: newAppointment.startDate,
      dataFim: newAppointment.endDate,
      horaInicio: `${String(newAppointment.startHour).padStart(2, '0')}:00`,
      horaFim: `${String(newAppointment.endHour).padStart(2, '0')}:00`,
      ehCompromisoAberto: newAppointment.isOpenAppointment,
      consultorEmail: newAppointment.consultorEmail
    }

    // Criar objeto com apenas o novo compromisso
    const agendaData = {
      timestamp: new Date().toISOString(),
      consultor: isConsultor ? {
        email: user?.email,
        id: user?.id,
        nome: user?.first_name || 'N/A'
      } : null,
      totalCompromissos: 1,
      compromissos: [novoCompromisso]
    }

    // Criar payload com chave agenda_json contendo apenas o novo compromisso
    const agendaPayload = {
      agenda_json: agendaData
    }

    // Fazer POST request
    try {
      console.log('📤 Enviando novo agendamento para /agenda/agendamento:', JSON.stringify(agendaPayload, null, 2))

      const response = await api.post('/agenda/agendamento', agendaPayload)

      console.log('✅ Resposta do servidor:', response)
      console.log('📊 Status:', response.status)

      // Adicionar o novo compromisso ao estado APÓS confirmação do servidor
      setAppointments([...appointments, newAppointment])
      setHasChanges(true)  // Marca como modificado

      setShowAppointmentModal(false)
      setAppointmentForm({
        title: '',
        description: '',
        responsible: '',
        startHour: '09',
        endHour: '10',
        isOpenAppointment: false
      })
      setSelectedDate(null)
      setSelectedDateRangeStart(null)
      setSelectedDateRangeEnd(null)

      setMessageModalType('success')
      setMessageModalContent(`✅ Agendamento criado e salvo com sucesso!\n\n${newAppointment.title}`)
      setShowMessageModal(true)
    } catch (error) {
      console.error('❌ Erro ao enviar agendamento:', error)

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

      // Exibir no modal com a resposta completa
      const modalContent = `STATUS: ${statusCode}\n\nRESPOSTA DO SERVIDOR:\n\n${responseContent}`

      setMessageModalType('error')
      setMessageModalContent(modalContent)
      setShowMessageModal(true)
    }
  }

  const handleCancelAppointment = () => {
    setShowAppointmentModal(false)
    setAppointmentForm({
      title: '',
      description: '',
      responsible: '',
      startHour: '09',
      endHour: '10'
    })
  }

  const handleAppointmentClick = (apt) => {
    // Se o compromisso já foi participado, não pode ser modificado
    if (apt.isParticipated) {
      setMessageModalType('error')
      setMessageModalContent(`Este agendamento já foi confirmado por:\n\n${apt.incubado}\nEmpresa: ${apt.empresa}\n\nNão pode ser modificado.`)
      setShowMessageModal(true)
      return
    }

    // Se o usuário é incubado (não é consultor), pode participar do agendamento
    if (!isConsultor && isIncubado) {
      // Verificar se o usuário já participa de outro agendamento do mesmo consultor
      const jaParticipaDesteConsultor = appointments.some(otherApt =>
        otherApt.isParticipated &&
        otherApt.incubado === user?.email &&
        otherApt.consultorEmail === apt.consultorEmail &&
        otherApt.id !== apt.id
      )

      if (jaParticipaDesteConsultor) {
        setMessageModalType('error')
        setMessageModalContent(`Você já está participando de outro agendamento deste consultor:\n\n${apt.consultorEmail}\n\nNão é permitido participar de mais de um agendamento por consultor.`)
        setShowMessageModal(true)
        return
      }

      setSelectedAppointmentForConfirmation(apt)
      setShowConfirmationModal(true)
    }
  }

  const handleConfirmAppointment = async (confirmed) => {
    if (!selectedAppointmentForConfirmation) return

    try {
      setConfirmationLoading(true)

      if (confirmed) {
        // Adicionar o usuário como participante do agendamento
        const aptIndex = appointments.findIndex(apt => apt.id === selectedAppointmentForConfirmation.id)
        if (aptIndex !== -1) {
          const updatedAppointments = [...appointments]
          const apt = updatedAppointments[aptIndex]
          const agendaId = apt.agendaId

          // Obter dados originais da agenda
          const agendaOriginal = agendaOriginalData[agendaId] || {}
          const nomeEmpresa = user?.company || user?.empresa || 'Empresa'

          // Criar o objeto do compromisso com os campos incubado e empresa adicionados
          const compromissoAtualizado = {
            id: apt.id,
            titulo: apt.title,
            descricao: apt.description || '',
            responsavel: apt.responsible || '',
            dataInicio: apt.startDate,
            dataFim: apt.endDate,
            horaInicio: `${String(apt.startHour).padStart(2, '0')}:00`,
            horaFim: `${String(apt.endHour).padStart(2, '0')}:00`,
            ehCompromisoAberto: apt.isOpenAppointment,
            consultorEmail: apt.consultorEmail,
            incubado: user?.email,
            empresa: nomeEmpresa,
            dataParticipacao: new Date().toISOString()
          }

          // Reconstruir o JSON completo da agenda com os dados originais
          const agendaJsonPayload = {
            timestamp: agendaOriginal.timestamp || new Date().toISOString(),
            consultor: agendaOriginal.consultor || {},
            totalCompromissos: agendaOriginal.totalCompromissos || 1,
            compromissos: [compromissoAtualizado]
          }

          // Criar payload com a estrutura esperada
          const participacaoPayload = {
            agenda_json: agendaJsonPayload
          }

          console.log('📅 Enviando participação do incubado para agenda ID:', agendaId)
          console.log('📅 Email do incubado:', user?.email)
          console.log('📅 Nome da empresa:', nomeEmpresa)
          console.log('📅 Payload:', JSON.stringify(participacaoPayload, null, 2))

          // Enviar participação para o servidor no endpoint /agenda/participar/{agendaId}
          const response = await api.put(
            `/agenda/participar/${agendaId}`,
            participacaoPayload
          )

          console.log('✅ Participação confirmada:', response.data)

          // Atualizar o estado local
          updatedAppointments[aptIndex] = {
            ...apt,
            incubado: user?.email,
            empresa: nomeEmpresa,
            dataParticipacao: new Date().toISOString()
          }
          setAppointments(updatedAppointments)
          setHasChanges(true)  // Marca como modificado

          setMessageModalType('success')
          setMessageModalContent(`✅ Sua participação foi confirmada!\n\n${selectedAppointmentForConfirmation.title}\nEmpresa: ${nomeEmpresa}`)
          setShowMessageModal(true)
        }
      } else {
        console.log('❌ Participação recusada pelo usuário')
        setMessageModalType('error')
        setMessageModalContent(`Participação recusada.\n\n${selectedAppointmentForConfirmation.title}`)
        setShowMessageModal(true)
      }

      setShowConfirmationModal(false)
      setSelectedAppointmentForConfirmation(null)
    } catch (error) {
      console.error('❌ Erro ao confirmar participação:', error)
      setMessageModalType('error')
      setMessageModalContent(`Erro ao confirmar participação.\n\n${error.message}`)
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
            {currentSection === 'overview' && (
              <div className="overview-section">
                <h2>Visão Geral</h2>
                <div className="stats-grid">
                  <div className="stat-card">
                    <div className="stat-icon">👥</div>
                    <div className="stat-info">
                      <h3>Usuários Totais</h3>
                      <p className="stat-number">{stats.totalUsers}</p>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">⏳</div>
                    <div className="stat-info">
                      <h3>Pendentes</h3>
                      <p className="stat-number">{stats.pendingReviews}</p>
                    </div>
                  </div>
                  <div className="stat-card">
                    <div className="stat-icon">✅</div>
                    <div className="stat-info">
                      <h3>Completos</h3>
                      <p className="stat-number">{stats.completedForms}</p>
                    </div>
                  </div>
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
                                {getAppointmentsForDate(selectedDate).map(apt => (
                                  <div
                                    key={apt.id}
                                    className={`appointment-item ${apt.isParticipated ? 'participated' : (!isConsultor && isIncubado ? 'clickable' : '')} ${apt.usuarios_participantes && apt.usuarios_participantes.length > 0 ? 'confirmed' : ''}`}
                                    onClick={() => handleAppointmentClick(apt)}
                                  >
                                    <div className="apt-title">{apt.title}</div>
                                    <div className="apt-consultor">
                                      💼 Consultor: {apt.consultorEmail}
                                    </div>
                                    {apt.isParticipated && (
                                      <div className="apt-participated">
                                        🔒 Participante: {apt.incubado}<br/>
                                        <span>Empresa: {apt.empresa}</span>
                                      </div>
                                    )}
                                    {!apt.isParticipated && apt.usuarios_participantes && apt.usuarios_participantes.length > 0 && (
                                      <div className="apt-confirmed">
                                        ✅ Participantes: {apt.usuarios_participantes.join(', ')}
                                      </div>
                                    )}
                                    {!apt.isParticipated && (!apt.usuarios_participantes || apt.usuarios_participantes.length === 0) && !isConsultor && isIncubado && (
                                      <div className="apt-click-hint">Clique para participar</div>
                                    )}
                                    {apt.description && <div className="apt-description">{apt.description}</div>}
                                    {apt.responsible && <div className="apt-responsible">👤 {apt.responsible}</div>}
                                    <div className="apt-period">
                                      {apt.startHour}:00 às {apt.endHour}:00
                                    </div>
                                  </div>
                                ))}
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
                        <h2>Agendar Compromisso</h2>
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

                        {!appointmentForm.isOpenAppointment && (
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
                          Agendar
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

                {showConfirmationModal && selectedAppointmentForConfirmation && (
                  <div className="modal-overlay">
                    <div className="modal-content" style={{ maxWidth: '450px' }}>
                      <div className="modal-icon" style={{ fontSize: '48px' }}>
                        🗓️
                      </div>
                      <h3 style={{ marginTop: '16px', color: 'var(--primary)' }}>
                        Participar do Agendamento
                      </h3>
                      <p style={{ marginTop: '12px', textAlign: 'center', color: '#374151' }}>
                        <strong>{selectedAppointmentForConfirmation.title}</strong>
                      </p>
                      <p style={{ marginTop: '8px', textAlign: 'center', color: '#374151', fontSize: '14px' }}>
                        De {selectedAppointmentForConfirmation.startDate} à {selectedAppointmentForConfirmation.endDate}
                        <br />
                        {selectedAppointmentForConfirmation.startHour}:00 às {selectedAppointmentForConfirmation.endHour}:00
                      </p>
                      <p style={{ marginTop: '16px', textAlign: 'center', color: '#374151', fontSize: '14px' }}>
                        Você deseja participar deste agendamento?
                      </p>
                      <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <button
                          className="btn btn-secondary"
                          onClick={() => handleConfirmAppointment(false)}
                          disabled={confirmationLoading}
                          style={{ flex: 1 }}
                        >
                          ❌ Não
                        </button>
                        <button
                          className="btn btn-primary"
                          onClick={() => handleConfirmAppointment(true)}
                          disabled={confirmationLoading}
                          style={{ flex: 1 }}
                        >
                          {confirmationLoading ? '⏳ Participando...' : '✅ Sim'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentSection === 'atividades' && (
              <div className="atividades-section">
                <h2>Práticas Chaves</h2>

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
