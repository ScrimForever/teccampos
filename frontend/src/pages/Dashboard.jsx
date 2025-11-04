import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import Loading from '../components/Loading'
import './Dashboard.css'

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
    totalSubmissions: 847,
    pendingReviews: 23,
    completedForms: 824
  })
  const [recentSubmissions, setRecentSubmissions] = useState([])

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

  const getSubmissionsForDate = (date) => {
    return recentSubmissions.filter(submission => submission.date === date)
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
      const submissions = getSubmissionsForDate(dateStr)
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
            ${submissions.length > 0 ? 'has-event' : ''}
            ${isSelected ? 'selected' : ''}
            ${isInRange ? 'in-range' : ''}
            ${scheduledAppointments.length > 0 ? 'has-appointment' : ''}
          `}
          onClick={() => handleDateClick(dateStr)}
          title={scheduledAppointments.length > 0 ? scheduledAppointments.map(apt => apt.title).join(', ') : ''}
        >
          <div className="day-number">{day}</div>
          <div className="day-indicators">
            {submissions.length > 0 && <div className="event-count">{submissions.length}</div>}
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
              className={`nav-item ${currentSection === 'submissions' ? 'active' : ''}`}
              onClick={() => setCurrentSection('submissions')}
            >
              <span className="nav-icon">📋</span>
              <span className="nav-label">Submissões</span>
            </button>
            <button
              className={`nav-item ${currentSection === 'agenda' ? 'active' : ''}`}
              onClick={() => setCurrentSection('agenda')}
            >
              <span className="nav-icon">📅</span>
              <span className="nav-label">Agenda</span>
            </button>
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
                    <div className="stat-icon">📝</div>
                    <div className="stat-info">
                      <h3>Submissões</h3>
                      <p className="stat-number">{stats.totalSubmissions}</p>
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

                <div className="recent-section">
                  <h3>Submissões Recentes</h3>
                  <table className="submissions-table">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Empresa</th>
                        <th>Data</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentSubmissions.map(submission => (
                        <tr key={submission.id}>
                          <td>{submission.name}</td>
                          <td>{submission.company}</td>
                          <td>{submission.date}</td>
                          <td>
                            <span className={`status-badge status-${submission.status}`}>
                              {submission.status === 'completed' ? '✓ Completo' : '⏳ Pendente'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {currentSection === 'submissions' && (
              <div className="submissions-section">
                <h2>Gerenciar Submissões</h2>
                <div className="recent-section">
                  <h3>Todas as Submissões</h3>
                  <table className="submissions-table">
                    <thead>
                      <tr>
                        <th>Nome</th>
                        <th>Empresa</th>
                        <th>Data</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentSubmissions.map(submission => (
                        <tr key={submission.id}>
                          <td>{submission.name}</td>
                          <td>{submission.company}</td>
                          <td>{submission.date}</td>
                          <td>
                            <span className={`status-badge status-${submission.status}`}>
                              {submission.status === 'completed' ? '✓ Completo' : '⏳ Pendente'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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

                            {getSubmissionsForDate(selectedDate).length > 0 && (
                              <div className="event-section">
                                <div className="section-title">Submissões</div>
                                {getSubmissionsForDate(selectedDate).map(submission => (
                                  <div key={submission.id} className="event-item">
                                    <div className="event-name">{submission.name}</div>
                                    <div className="event-company">{submission.company}</div>
                                    <div className="event-status">
                                      <span className={`status-badge status-${submission.status}`}>
                                        {submission.status === 'completed' ? '✓ Completo' : '⏳ Pendente'}
                                      </span>
                                    </div>
                                  </div>
                                ))}
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
                            {getSubmissionsForDate(selectedDate).length === 0 && getAppointmentsForDate(selectedDate).length === 0 && (
                              <div className="no-events">
                                <p>Nenhum evento nesta data</p>
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
