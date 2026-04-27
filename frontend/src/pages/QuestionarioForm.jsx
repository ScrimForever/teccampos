import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { api } from '../services/api'
import DashboardLayout from '../components/DashboardLayout'
import '../styles/DashboardLayout.css'
import './QuestionarioForm.css'

function QuestionarioForm() {
  const navigate = useNavigate()
  const location = useLocation()
  const { logout, user } = useAuth()
  const viewPlan = location.state?.viewPlan
  const isViewOnly = !!viewPlan
  const [currentStep, setCurrentStep] = useState(1)
  const [formData, setFormData] = useState({
    nomeProponente: '',
    nomeNegocio: '',
    setorAtuacao: '',
    cnpj: '',
    businessModelCanvas: '',
    executiveSummary: '',
    produtoServico: '',
    analiseFornecedores: '',
    analiseCompetidores: '',
    planejamentoMercado: '',
    estrategiaMarketing: '',
    planejamentoEstrutura: '',
    planejamentoFinanceiro: '',
  })
  const [teamMembers, setTeamMembers] = useState([])
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [submittedData, setSubmittedData] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [savedData, setSavedData] = useState(null)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [errorModal, setErrorModal] = useState({ show: false, message: '' })
  const [isConsultor, setIsConsultor] = useState(false)
  const [consultorId, setConsultorId] = useState(null)
  const [questionarioId, setQuestionarioId] = useState(null)
  const [planId, setPlanId] = useState(null)
  const [userId, setUserId] = useState(null)
  const [equipeId, setEquipeId] = useState(null)
  const [planejamentoMercadoId, setPlanejamentoMercadoId] = useState(null)
  const [notes, setNotes] = useState({
    1: { text: '', rating: null, consultorEmail: null },
    2: { text: '', rating: null, consultorEmail: null },
    3: { text: '', rating: null, consultorEmail: null },
    4: { text: '', rating: null, consultorEmail: null },
    5: { text: '', rating: null, consultorEmail: null },
    6: { text: '', rating: null, consultorEmail: null },
    7: { text: '', rating: null, consultorEmail: null },
    8: { text: '', rating: null, consultorEmail: null },
    9: { text: '', rating: null, consultorEmail: null }
  })

  useEffect(() => {
    const checkConsultorStatus = async () => {
      try {
        const response = await api.get('/users/me')
        setIsConsultor(response.data?.is_consultant === true)
        setConsultorId(response.data?.id)
        setUserId(response.data?.id)
      } catch (err) {
        console.error('Error checking consultor status:', err)
        setIsConsultor(false)
      }
    }
    checkConsultorStatus()
  }, [])

  useEffect(() => {
    const loadData = async () => {
      if (isViewOnly && viewPlan) {
        loadViewPlanData(viewPlan)
      } else if (userId) {
        // Only load questionnaire data after userId is available
        await loadQuestionnaireData()
      }
    }
    loadData()
  }, [isViewOnly, viewPlan, userId])

  // Load team members from API as soon as equipeId is available
  useEffect(() => {
    if (!planejamentoMercadoId || !isViewOnly) return
    const fetchPlanejamento = async () => {
      try {
        const response = await api.get(`/planejamento/${planejamentoMercadoId}`)
        if (response.data) {
          const p = response.data
          setFormData(prev => ({
            ...prev,
            analiseFornecedores: p.fornecedores || prev.analiseFornecedores,
            analiseCompetidores: p.concorrentes || prev.analiseCompetidores,
            planejamentoMercado: p.analise_acao || prev.planejamentoMercado
          }))
          if (p.upload_file_path) {
            setUploadedFiles(prev =>
              prev.length > 0 ? prev : [new File([new Blob()], p.upload_file_path, { type: 'application/octet-stream' })]
            )
          }
          console.log('✔️ Planejamento data loaded for view mode:', p)
        }
      } catch (error) {
        console.error('❌ Error loading planejamento data:', error)
      }
    }
    fetchPlanejamento()
  }, [planejamentoMercadoId, isViewOnly])

  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!equipeId) return
      try {
        const response = await api.get(`/membros/${equipeId}`)
        if (Array.isArray(response.data)) {
          const members = response.data.map((m) => ({
            id: m.id,
            backendId: m.id,
            nome: m.nome || '',
            formacaoAcademica: m.formacao_academica || '',
            experiencia: m.experiencia || '',
            email: m.email || '',
            telefone: m.telefone || '',
          }))
          setTeamMembers(members)
        }
      } catch (error) {
        console.error('❌ Error loading team members:', error)
      }
    }
    fetchTeamMembers()
  }, [equipeId])



  const loadQuestionnaireData = async () => {
    try {
      console.log('🔄 Loading questionnaire data from /questionario...')
      console.log('🔑 Current userId:', userId)

      const response = await api.get('/questionario')
      console.log('📥 Response received:', response)
      console.log('📦 Response data:', JSON.stringify(response.data, null, 2))

      if (response.data) {
        console.log('✅ Questionnaire data loaded successfully')

        // Check if response.data is an array and get first item, or use data directly
        const data = Array.isArray(response.data) ? response.data[0] : response.data

        console.log('📋 Data to map:', data)
        console.log('📊 Planejamento Mercado Rel:', data.planejamento_mercado_rel)

        // Map API fields to form fields
        const newFormData = {
          nomeProponente: data.nome_proponente || '',
          nomeNegocio: data.nome_negocio || '',
          setorAtuacao: data.setor_atuacao || '',
          cnpj: data.cnpj || '',
          businessModelCanvas: data.business_canvas || '',
          executiveSummary: data.sumario_executivo || '',
          produtoServico: data.planejamento_produto || data.produto_servico || '',
          analiseFornecedores: data.planejamento_mercado_rel?.fornecedores || data.fornecedores || data.analise_fornecedores || '',
          analiseCompetidores: data.planejamento_mercado_rel?.concorrentes || data.concorrentes || data.analise_competidores || '',
          planejamentoMercado: data.planejamento_mercado_rel?.analise_acao || data.analise_acao || '',
          estrategiaMarketing: data.planejamento_marketing || data.estrategia_marketing || '',
          planejamentoEstrutura: data.planejamento_estrutura || '',
          planejamentoFinanceiro: data.planejamento_financeiro || ''
        }

        console.log('📝 New form data:', newFormData)
        setFormData(prev => ({
          ...prev,
          ...newFormData
        }))

        // Set equipe ID if present
        if (data.equipe) {
          setEquipeId(data.equipe)
          console.log('✅ Equipe ID loaded:', data.equipe)
        }

        // Set planejamento_mercado ID if present
        if (data.planejamento_mercado) {
          setPlanejamentoMercadoId(data.planejamento_mercado)
          console.log('✅ Planejamento Mercado ID loaded:', data.planejamento_mercado)
        }

        // Team members are loaded via dedicated GET /membros/{equipeId} effect

        // Load uploaded file if present
        const filePath = data.planejamento_mercado_rel?.upload_file_path || data.upload_file_path
        if (filePath) {
          const mockFile = new File([new Blob()], filePath, {
            type: 'application/octet-stream'
          })
          setUploadedFiles([mockFile])
          console.log('✅ File loaded:', filePath)
        }

        console.log('✅ All data loaded and state updated')
      } else {
        console.log('⚠️ No data in response')
      }
    } catch (error) {
      console.error('❌ Error loading questionnaire data:', error)
      console.error('❌ Error response:', error.response)
      console.error('❌ Error status:', error.response?.status)
      console.error('❌ Error data:', error.response?.data)

      // Don't show error to user if no data exists yet
      if (error.response?.status !== 404) {
        console.error('Error details:', error.message)
      } else {
        console.log('ℹ️ No questionnaire found (404) - creating new questionnaire for first-time user')
        try {
          const createResponse = await api.post('/questionario', {
            usuario_associado: user?.email || '',
            nome_proponente: '',
            nome_negocio: '',
            setor_atuacao: '',
            cnpj: '',
            business_canvas: '',
            sumario_executivo: '',
            planejamento_produto: '',
            planejamento_marketing: '',
            planejamento_estrutura: ''
          })
          if (createResponse.data?.equipe) {
            setEquipeId(createResponse.data.equipe)
          }
          if (createResponse.data?.planejamento_mercado) {
            setPlanejamentoMercadoId(createResponse.data.planejamento_mercado)
          }
          console.log('✅ Questionnaire created successfully for new user')
        } catch (createError) {
          console.error('❌ Error creating questionnaire:', createError)
        }
      }
    }
  }

  const loadViewPlanData = (plan) => {
    try {
      console.log('🔄 Loading plan data for viewing...', plan)

      // Extract plan ID if present
      if (plan.id) {
        setPlanId(plan.id)
        console.log('✔️ Plan ID set:', plan.id)
      }

      // Extract questionario ID from plan if present
      if (plan.questionario_id) {
        setQuestionarioId(plan.questionario_id)
        console.log('✔️ Questionario ID set from view plan:', plan.questionario_id)
      } else if (plan.questionario?.id) {
        setQuestionarioId(plan.questionario.id)
        console.log('✔️ Questionario ID set from nested questionario:', plan.questionario.id)
      }

      // Try multiple paths for questionario data
      let questionarioData = plan.questionario_json || plan.questionario || plan

      // Extract form data: prefer pre-serialized formData, otherwise map snake_case API fields
      const hasSerializedFormData = !!questionarioData?.formData
      if (hasSerializedFormData) {
        setFormData(prev => ({
          ...prev,
          ...questionarioData.formData
        }))
        console.log('✔️ Form data loaded from plan:', questionarioData.formData)
      } else {
        const mappedData = {
          nomeProponente: questionarioData.nome_proponente || '',
          nomeNegocio: questionarioData.nome_negocio || '',
          setorAtuacao: questionarioData.setor_atuacao || '',
          cnpj: questionarioData.cnpj || '',
          businessModelCanvas: questionarioData.business_canvas || '',
          executiveSummary: questionarioData.sumario_executivo || '',
          produtoServico: questionarioData.planejamento_produto || questionarioData.produto_servico || '',
          analiseFornecedores: questionarioData.planejamento_mercado_rel?.fornecedores || questionarioData.fornecedores || questionarioData.analise_fornecedores || '',
          analiseCompetidores: questionarioData.planejamento_mercado_rel?.concorrentes || questionarioData.concorrentes || questionarioData.analise_competidores || '',
          planejamentoMercado: questionarioData.planejamento_mercado_rel?.analise_acao || questionarioData.analise_acao || '',
          estrategiaMarketing: questionarioData.planejamento_marketing || questionarioData.estrategia_marketing || '',
          planejamentoEstrutura: questionarioData.planejamento_estrutura || '',
          planejamentoFinanceiro: questionarioData.planejamento_financeiro || ''
        }
        if (Object.values(mappedData).some(v => v !== '')) {
          setFormData(prev => ({ ...prev, ...mappedData }))
          console.log('✔️ Form data mapped from snake_case fields:', mappedData)
        }

        // Set IDs so related data loads via existing effects (only for raw API objects)
        if (!plan.questionario_id && !plan.questionario?.id && questionarioData.id) {
          setQuestionarioId(questionarioData.id)
        }
        if (questionarioData.equipe) {
          setEquipeId(questionarioData.equipe)
          console.log('✔️ Equipe ID set for view mode:', questionarioData.equipe)
        }
        if (questionarioData.planejamento_mercado) {
          setPlanejamentoMercadoId(questionarioData.planejamento_mercado)
        }

        // Load file from path (raw API path)
        const filePath = questionarioData.planejamento_mercado_rel?.upload_file_path || questionarioData.upload_file_path
        if (filePath) {
          setUploadedFiles([new File([new Blob()], filePath, { type: 'application/octet-stream' })])
          console.log('✔️ File loaded from path:', filePath)
        }
      }

      // Load team members if present in pre-serialized format
      if (questionarioData?.teamMembers && Array.isArray(questionarioData.teamMembers)) {
        const membersWithIds = questionarioData.teamMembers.map(member => ({
          nome: member.nome || '',
          formacaoAcademica: member.formacaoAcademica || member.formacao || member.formacao_academica || '',
          experiencia: member.experiencia || '',
          email: member.email || '',
          id: member.id || Date.now() + Math.random()
        }))
        setTeamMembers(membersWithIds)
        console.log('✔️ Team members loaded:', membersWithIds)
      }

      // Load uploaded files from pre-serialized format
      if (questionarioData?.uploadedFiles && Array.isArray(questionarioData.uploadedFiles)) {
        const filesWithObjects = questionarioData.uploadedFiles.map(fileData =>
          new File([new Blob()], fileData.name || 'file', { type: fileData.type || 'application/octet-stream' })
        )
        setUploadedFiles(filesWithObjects)
        console.log('✔️ Uploaded files loaded:', filesWithObjects)
      }

      // Load notes if present
      if (questionarioData?.notes && typeof questionarioData.notes === 'object') {
        setNotes(prev => ({
          ...prev,
          ...questionarioData.notes
        }))
        console.log('✔️ Notes loaded:', questionarioData.notes)
      }
    } catch (error) {
      console.error('❌ Error loading view plan data:', error)
      console.error('❌ Error message:', error.message)
    }
  }

  const handleAddTeamMember = async () => {
    const newMember = { id: Date.now(), nome: '', formacaoAcademica: '', experiencia: '', email: '' }
    setTeamMembers([...teamMembers, newMember])
  }

  const handleSaveTeamMember = async (member) => {
    if (!equipeId) {
      console.error('❌ Equipe ID not available')
      alert('Erro: ID da equipe não encontrado. Por favor, salve o formulário primeiro.')
      return
    }

    if (!member.nome || !member.formacaoAcademica || !member.experiencia || !member.email) {
      alert('Por favor, preencha todos os campos do membro antes de salvar.')
      return
    }

    try {
      const memberData = {
        nome: member.nome,
        formacao_academica: member.formacaoAcademica,
        experiencia: member.experiencia,
        email: member.email,
        equipe_id: equipeId
      }

      console.log(`📤 Sending team member to /membros/${equipeId}:`, memberData)
      const response = await api.post(`/membros/${equipeId}`, memberData)
      console.log('✅ Team member saved successfully!', response.data)
      alert('Membro da equipe salvo com sucesso!')
    } catch (error) {
      console.error('❌ Error saving team member:', error)
      const message = error.status === 409
        ? 'Este e-mail já está em uso. O membro deve utilizar outro e-mail.'
        : 'Erro ao salvar membro da equipe. Tente novamente.'
      setErrorModal({ show: true, message })
      setTimeout(() => setErrorModal({ show: false, message: '' }), 3000)
    }
  }

  const handleDeleteTeamMember = (id) => {
    setTeamMembers(teamMembers.filter((member) => member.id !== id))
  }

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files)
    setUploadedFiles([...uploadedFiles, ...files])
  }

  const handleDeleteFile = (index) => {
    setUploadedFiles(uploadedFiles.filter((_, i) => i !== index))
  }

  const steps = [
    { number: 1, title: 'Setor de atuação' },
    { number: 2, title: 'Desenvolva o Business Model Canvas para seu negócio' },
    { number: 3, title: 'Sumário executivo' },
    { number: 4, title: 'Equipe' },
    { number: 5, title: 'Planejamento/Desenvolvimento do Produto e/ou Serviço' },
    { number: 6, title: 'Planejamento das ações do Mercado' },
    { number: 7, title: 'Planejamento das ações de Marketing' },
    { number: 8, title: 'Planejamento da Estrutura, Gerência e Operações' },
    { number: 9, title: 'Planejamento Financeiro' },
  ]

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  const isStepAccessible = (stepNumber) => {
    if (isViewOnly) return true
    if (stepNumber === 1) return true
    return isStepComplete(stepNumber - 1)
  }

  const isStepComplete = (stepNumber) => {
    // In view mode, all steps with data are considered complete
    if (isViewOnly) {
      switch(stepNumber) {
        case 1:
          return formData.nomeProponente || formData.nomeNegocio || formData.setorAtuacao
        case 2:
          return !!formData.businessModelCanvas
        case 3:
          return !!formData.executiveSummary
        case 4:
          return teamMembers.length > 0
        case 5:
          return !!formData.produtoServico
        case 6:
          return !!(formData.analiseFornecedores || formData.analiseCompetidores || formData.planejamentoMercado)
        case 7:
          return !!formData.estrategiaMarketing
        case 8:
          return !!formData.planejamentoEstrutura
        case 9:
          return uploadedFiles.length > 0
        default:
          return false
      }
    }

    // Normal edit mode
    switch(stepNumber) {
      case 1:
        return formData.nomeProponente && formData.nomeNegocio && formData.setorAtuacao
      case 2:
        return formData.businessModelCanvas
      case 3:
        return formData.executiveSummary
      case 4:
        return teamMembers.length > 0
      case 5:
        return formData.produtoServico
      case 6:
        return formData.analiseFornecedores && formData.analiseCompetidores && formData.planejamentoMercado && uploadedFiles.length > 0
      case 7:
        return formData.estrategiaMarketing
      case 8:
        return formData.planejamentoEstrutura
      case 9:
        return uploadedFiles.length > 0
      default:
        return false
    }
  }

  const isStepNeedsAttention = (stepNumber) => {
    if (!isViewOnly) return false
    const hasContent = isStepComplete(stepNumber)
    const hasRating = !isConsultor || !!notes[stepNumber]?.rating
    return !hasContent || !hasRating
  }

  // Helper function to map rating number to text label
  const getRatingLabel = (ratingValue) => {
    const ratingLabels = {
      1: 'Ruim',
      2: 'Razoável',
      3: 'Bom',
      4: 'Muito Bom',
      5: 'Excelente'
    }
    return ratingLabels[ratingValue] || null
  }

  const handleSave = async () => {
    // Prevent save if user is incubado and viewing a plan
    if (isViewOnly && user?.is_incubated) {
      return
    }

    // Update the current step's note with consultant email
    const updatedNotes = { ...notes }
    if (notes[currentStep]?.text || notes[currentStep]?.rating) {
      updatedNotes[currentStep] = {
        ...notes[currentStep],
        consultorEmail: user?.email
      }
    }

    // Create notes output with rating labels included
    const notesOutput = {}
    Object.keys(updatedNotes).forEach(step => {
      const note = updatedNotes[step]
      if (note && (note.text || note.rating)) {
        notesOutput[step] = {
          text: note.text || '',
          rating: note.rating !== null ? note.rating : null,
          ratingLabel: note.rating !== null ? getRatingLabel(note.rating) : null,
          consultorEmail: note.consultorEmail || null
        }
      }
    })

    const saveData = {
      timestamp: new Date().toISOString(),
      currentStep: currentStep,
      formData: formData,
      teamMembers: teamMembers.map(member => ({
        nome: member.nome,
        formacaoAcademica: member.formacaoAcademica,
        experiencia: member.experiencia,
        email: member.email
      })),
      uploadedFiles: uploadedFiles && Array.isArray(uploadedFiles) ? uploadedFiles.map(file => ({
        name: file.name || '',
        size: file.size || 0,
        type: file.type || '',
        lastModified: file.lastModified || null
      })) : [],
      notes: notesOutput
    }

    console.log('Saved data:', saveData)

    try {
      // If in view mode and is consultor, send different request
      if (isViewOnly && questionarioId && isConsultor) {
        try {
          // Create the questionario output in the required format (include notes)
          const questionarioOutput = {
            timestamp: saveData.timestamp,
            formData: saveData.formData,
            teamMembers: saveData.teamMembers,
            uploadedFiles: saveData.uploadedFiles,
            notes: saveData.notes
          }

          console.log('📤 Sending view mode save request')
          console.log('questionario_user (path param):', String(questionarioId))
          console.log('questionario output (request body):', questionarioOutput)

          await api.put(`/questionario/questionario/${String(questionarioId)}`, questionarioOutput)
          console.log('✅ View mode save request sent successfully!')
          setNotes(updatedNotes)
          setShowSaveModal(true)

          // Auto close modal after 3 seconds
          setTimeout(() => {
            setShowSaveModal(false)
          }, 3000)
          return
        } catch (viewModeError) {
          console.error('❌ Error in view mode save:', viewModeError)
          alert('Erro ao salvar formulário. Tente novamente.')
          return
        }
      }

      // Regular edit mode save
      if (!userId) {
        console.error('❌ User ID not available')
        alert('Erro: ID do usuário não encontrado. Por favor, faça login novamente.')
        return
      }

      const requestBody = {
        nome_proponente: formData.nomeProponente || '',
        usuario_associado: user?.email || '',
        nome_negocio: formData.nomeNegocio || '',
        setor_atuacao: formData.setorAtuacao || '',
        cnpj: formData.cnpj || '',
        business_canvas: formData.businessModelCanvas || '',
        sumario_executivo: formData.executiveSummary || '',
        planejamento_produto: formData.produtoServico || '',
        planejamento_marketing: formData.estrategiaMarketing || '',
        planejamento_estrutura: formData.planejamentoEstrutura || ''
      }

      // Add equipe only if it already exists (to prevent overwriting)
      if (equipeId) {
        requestBody.equipe = equipeId
      }

      // Add planejamento_mercado only if it already exists (to prevent overwriting)
      if (planejamentoMercadoId) {
        requestBody.planejamento_mercado = planejamentoMercadoId
      }

      console.log('📤 Sending save request with body:', requestBody)
      console.log('📝 Business Canvas value:', formData.businessModelCanvas)
      const response = await api.post('/questionario', requestBody)
      console.log('Data sent to server:', response)
      console.log('📦 Response data:', response.data)
      console.log('📊 Planejamento Mercado Rel from response:', response.data?.planejamento_mercado_rel)
      console.log('✅ Form saved successfully!')

      // Capture equipe ID if present in response
      if (response.data?.equipe && !equipeId) {
        setEquipeId(response.data.equipe)
        console.log('✅ Equipe ID captured:', response.data.equipe)
      }

      // On step 4, fetch questionnaire to ensure equipeId is available for team members
      if (currentStep === 4) {
        await loadQuestionnaireData()
      }

      // Capture planejamento_mercado ID if present in response
      if (response.data?.planejamento_mercado && !planejamentoMercadoId) {
        setPlanejamentoMercadoId(response.data.planejamento_mercado)
        console.log('✅ Planejamento Mercado ID captured:', response.data.planejamento_mercado)
      }

      // Update form fields from planejamento_mercado_rel if present
      if (response.data?.planejamento_mercado_rel) {
        const rel = response.data.planejamento_mercado_rel
        setFormData(prev => ({
          ...prev,
          analiseFornecedores: rel.fornecedores || prev.analiseFornecedores,
          analiseCompetidores: rel.concorrentes || prev.analiseCompetidores,
          planejamentoMercado: rel.analise_acao || prev.planejamentoMercado
        }))

        // Update uploaded file if present
        if (rel.upload_file_path && uploadedFiles.length === 0) {
          const mockFile = new File([new Blob()], rel.upload_file_path, {
            type: 'application/octet-stream'
          })
          setUploadedFiles([mockFile])
          console.log('✅ File loaded from planejamento_mercado_rel:', rel.upload_file_path)
        }
      }

      // If on step 6, send planejamento data
      if (currentStep === 6) {
        await savePlanejamento(formData, uploadedFiles)
      }

      // Update state with the email for current step only
      setNotes(updatedNotes)

      setShowSaveModal(true)

      // Auto close modal after 3 seconds
      setTimeout(() => {
        setShowSaveModal(false)
      }, 3000)
    } catch (error) {
      console.error('Error saving data:', error)
      console.error('❌ Error:', error.message)
      alert('Erro ao salvar formulário. Verifique sua conexão.')
    }
  }

  const savePlanejamento = async (currentFormData, currentFiles) => {
    if (!planejamentoMercadoId) return
    try {
      const planejamentoBody = {
        fornecedores: currentFormData.analiseFornecedores || '',
        concorrentes: currentFormData.analiseCompetidores || '',
        analise_acao: currentFormData.planejamentoMercado || '',
        upload_file_path: currentFiles.length > 0 ? currentFiles[0].name : ''
      }
      await api.put(`/planejamento/${planejamentoMercadoId}`, planejamentoBody)
      console.log('✅ Planejamento data saved successfully!')
    } catch (planejamentoError) {
      console.error('❌ Error saving planejamento data:', planejamentoError)
    }
  }

  const handleStepClick = async (stepNumber) => {
    if (!isStepAccessible(stepNumber)) return
    if (stepNumber === 4 && !isViewOnly) {
      await handleSave()
    }
    if (currentStep === 6 && !isViewOnly) {
      await savePlanejamento(formData, uploadedFiles)
    }
    setCurrentStep(stepNumber)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (currentStep < steps.length) {
      const nextStep = currentStep + 1
      if (nextStep === 4 && !isViewOnly) {
        await handleSave()
      }
      if (currentStep === 6 && !isViewOnly) {
        await savePlanejamento(formData, uploadedFiles)
      }
      setCurrentStep(nextStep)
    } else {
      // Final step - submit the form
      setIsLoading(true)

      const finalData = {
        nome_proponente: formData.nomeProponente || '',
        usuario_associado: user?.email || '',
        nome_negocio: formData.nomeNegocio || '',
        setor_atuacao: formData.setorAtuacao || '',
        cnpj: formData.cnpj || '',
        business_canvas: formData.businessModelCanvas || '',
        sumario_executivo: formData.executiveSummary || '',
        planejamento_produto: formData.produtoServico || '',
        planejamento_marketing: formData.estrategiaMarketing || '',
        planejamento_estrutura: formData.planejamentoEstrutura || '',
        ...(equipeId ? { equipe: equipeId } : {}),
        ...(planejamentoMercadoId ? { planejamento_mercado: planejamentoMercadoId } : {})
      }

      try {
        const response = await api.post('/questionario', finalData)

        console.log('Submitted data:', finalData)
        console.log('Response:', response)

        // Check if response status is 200
        if (response.status === 200) {
          console.log('✅ Form submitted successfully!')

          // If user is a consultor, send additional request to update questionario with notes
          if (isConsultor && consultorId && response.data?.id) {
            try {
              const updateData = {
                questionario_user: consultorId,
                update_field: finalData
              }

              await api.patch(`/questionario/${response.data.id}`, updateData)
              console.log('✅ Consultor update sent successfully!')
            } catch (updateError) {
              console.error('⚠️ Warning: Consultor update failed:', updateError)
              // Continue even if update fails
            }
          }

          try {
            await api.put('/status', {
              user_email: user?.email || '',
              status_type: 'waiting_approve'
            })
            console.log('✅ Status updated to waiting_approve!')
          } catch (statusError) {
            console.error('⚠️ Warning: Status update failed:', statusError)
          }

          setIsLoading(false)
          navigate('/aguardando-aprovacao', { replace: true })
        }
      } catch (error) {
        console.error('❌ Error submitting form:', error)
        setIsLoading(false)
        alert('Erro ao enviar formulário. Tente novamente.')
      }
    }
  }

  const handleLogout = () => {
    logout()
  }

  return (
    <DashboardLayout>
      <div className="questionario-container">
        <div className="questionario-header">
        <h1>Questionário Plano de Negócios</h1>
        <div className="header-actions">
          <span className="user-info">👤 {user?.email || 'Usuário'}</span>
          <button
            type="button"
            className="save-header-btn"
            onClick={handleSave}
            disabled={isViewOnly && user?.is_incubated}
          >
            Salvar
          </button>
          <button
            type="button"
            className="logout-header-btn"
            onClick={handleLogout}
          >
            Logout
          </button>
        </div>
      </div>

      {showSaveModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon">✓</div>
            <h3>Formulário Salvo com Sucesso!</h3>
            <p>Seus dados foram salvos. Você pode continuar editando ou enviar o formulário.</p>
          </div>
        </div>
      )}

      {errorModal.show && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-icon" style={{ color: '#e53e3e' }}>✕</div>
            <h3 style={{ color: '#e53e3e' }}>Erro</h3>
            <p>{errorModal.message}</p>
          </div>
        </div>
      )}

      <div className="questionario-content">
        <div className="steps-container">
          {steps.map((step) => (
            <button
              key={step.number}
              className={`step-button ${currentStep === step.number ? 'active' : ''} ${isViewOnly ? (isStepNeedsAttention(step.number) ? 'needs-attention' : 'complete') : (isStepComplete(step.number) ? 'complete' : 'incomplete')} ${!isStepAccessible(step.number) ? 'locked' : ''}`}
              onClick={() => handleStepClick(step.number)}
              disabled={!isStepAccessible(step.number)}
              title={!isStepAccessible(step.number) ? `Complete a etapa ${step.number - 1} antes` : step.title}
            >
              {step.number}
            </button>
          ))}
        </div>

        <div className="questionario-card">
          {savedData && !submittedData ? (
            <div className="save-result">
              <h2>Dados Salvos</h2>
              <div className="json-output">
                <h3>JSON Salvo:</h3>
                <pre>{JSON.stringify(savedData, null, 2)}</pre>
              </div>
              <button
                type="button"
                className="close-save-btn"
                onClick={() => setSavedData(null)}
              >
                Fechar
              </button>
            </div>
          ) : submittedData ? (
            <div className="submission-result">
              <h2>Formulário Enviado com Sucesso!</h2>
              <div className="json-output">
                <h3>Dados Submetidos (JSON):</h3>
                <pre>{JSON.stringify(submittedData, null, 2)}</pre>
              </div>
              <button
                type="button"
                className="reset-btn"
                onClick={() => {
                  setSubmittedData(null)
                  setCurrentStep(1)
                  setFormData({
                    nomeProponente: '',
                    nomeNegocio: '',
                    setorAtuacao: '',
                    cnpj: '',
                    businessModelCanvas: '',
                    executiveSummary: '',
                    produtoServico: '',
                    analiseFornecedores: '',
                    analiseCompetidores: '',
                    planejamentoMercado: '',
                    estrategiaMarketing: '',
                    planejamentoEstrutura: '',
                    planejamentoFinanceiro: '',
                  })
                  setTeamMembers([])
                  setUploadedFiles([])
                }}
              >
                Novo Formulário
              </button>
            </div>
          ) : (
            <>
              {isViewOnly && (
                <div style={{
                  backgroundColor: '#e7f3ff',
                  border: '2px solid #3b82f6',
                  borderRadius: '8px',
                  padding: '16px',
                  marginBottom: '20px',
                  textAlign: 'center'
                }}>
                  <strong style={{ color: '#1e40af', fontSize: '16px' }}>
                    📖 Modo Visualização - Todos os campos estão desabilitados para edição
                  </strong>
                </div>
              )}
              <h2>{steps[currentStep - 1].title}</h2>

              <div className="form-wrapper">
            {currentStep === 1 && (
              <form onSubmit={handleSubmit} className="form-grid">
                <div className="form-group">
                  <label htmlFor="nomeProponente">Nome do proponente</label>
                  <input
                    type="text"
                    id="nomeProponente"
                    name="nomeProponente"
                    value={formData.nomeProponente}
                    onChange={handleChange}
                    placeholder="Insira o nome do proponente"
                    disabled={isViewOnly}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="nomeNegocio">Nome do negócio</label>
                  <input
                    type="text"
                    id="nomeNegocio"
                    name="nomeNegocio"
                    value={formData.nomeNegocio}
                    onChange={handleChange}
                    placeholder="Insira o nome do negócio"
                    disabled={isViewOnly}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="setorAtuacao">Setor de atuação</label>
                  <input
                    type="text"
                    id="setorAtuacao"
                    name="setorAtuacao"
                    value={formData.setorAtuacao}
                    onChange={handleChange}
                    placeholder="Insira o setor de atuação"
                    disabled={isViewOnly}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="cnpj">CNPJ</label>
                  <input
                    type="text"
                    id="cnpj"
                    name="cnpj"
                    value={formData.cnpj}
                    onChange={handleChange}
                    placeholder="Insira o CNPJ"
                    disabled={isViewOnly}
                  />
                </div>
              </form>
            )}

            {currentStep === 2 && (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <p className="label-info">
                    No texto, você deverá responder:<br />
                    • Segmento de Clientes:<br />
                    • Proposta de Valor:<br />
                    • Relacionamento com o cliente:<br />
                    • Canais:<br />
                    • Fonte de receitas:<br />
                    • Atividades Chave:<br />
                    • Recursos Chave:<br />
                    • Estrutura de Custos:<br />
                    • Parcerias:
                  </p>
                  <textarea
                    id="businessModelCanvas"
                    name="businessModelCanvas"
                    value={formData.businessModelCanvas}
                    onChange={handleChange}
                    placeholder="Descreva o Business Model Canvas do seu negócio"
                    rows="15"
                    disabled={isViewOnly}
                  />
                </div>
              </form>
            )}

            {currentStep === 3 && (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <p className="label-info">
                    Faça um texto resumido sobre o negócio no qual pretende desenvolver (máximo 1 página). Recomenda-se que o resumo seja elaborado após o preenchimento de todas as demais etapas. No texto, você deverá responder:<br />
                    • O que é o negócio e o produto e/ou serviço a ser desenvolvido?<br />
                    • Por que irá desenvolver? Descreva a demanda de mercado encontrada.<br />
                    • Onde será desenvolvido? Descreva o local, público-alvo e a concorrência do negócio.<br />
                    • Quem irá desenvolver? Descreva a equipe envolvida no negócio.<br />
                    • Quando irá desenvolver? Descreva quando pretende iniciar o desenvolvimento do produto e/ou serviço.<br />
                    • Como irá desenvolver? Descreva o método utilizado para o desenvolvimento do produto e/ou serviço.<br />
                    • Quanto custa? Identifique o custo necessário para desenvolver o negócio.
                  </p>
                  <textarea
                    id="executiveSummary"
                    name="executiveSummary"
                    value={formData.executiveSummary}
                    onChange={handleChange}
                    placeholder="Escreva seu sumário executivo aqui"
                    rows="15"
                    disabled={isViewOnly}
                  />
                </div>

              </form>
            )}

            {currentStep === 4 && (
              <form onSubmit={handleSubmit}>
                <div className="team-container">
                  <button
                    type="button"
                    className="add-team-btn"
                    onClick={handleAddTeamMember}
                    disabled={isViewOnly}
                  >
                    + Adicionar Membro da Equipe
                  </button>

                  {teamMembers.length > 0 && (
                    <div className="team-members-list">
                      {teamMembers.map((member) => (
                        <div key={member.id} className="team-member-card">
                          <div className="team-member-inputs">
                            <input
                              type="text"
                              placeholder="Nome"
                              value={member.nome}
                              onChange={(e) => {
                                const updated = teamMembers.map((m) =>
                                  m.id === member.id ? { ...m, nome: e.target.value } : m
                                )
                                setTeamMembers(updated)
                              }}
                              disabled={isViewOnly}
                            />
                            <input
                              type="text"
                              placeholder="Formação Acadêmica"
                              value={member.formacaoAcademica}
                              onChange={(e) => {
                                const updated = teamMembers.map((m) =>
                                  m.id === member.id ? { ...m, formacaoAcademica: e.target.value } : m
                                )
                                setTeamMembers(updated)
                              }}
                              disabled={isViewOnly}
                            />
                            <input
                              type="text"
                              placeholder="Experiência"
                              value={member.experiencia}
                              onChange={(e) => {
                                const updated = teamMembers.map((m) =>
                                  m.id === member.id ? { ...m, experiencia: e.target.value } : m
                                )
                                setTeamMembers(updated)
                              }}
                              disabled={isViewOnly}
                            />
                            <input
                              type="email"
                              placeholder="Email"
                              value={member.email}
                              onChange={(e) => {
                                const updated = teamMembers.map((m) =>
                                  m.id === member.id ? { ...m, email: e.target.value } : m
                                )
                                setTeamMembers(updated)
                              }}
                              disabled={isViewOnly}
                            />
                          </div>
                          <div className="team-member-actions">
                            <button
                              type="button"
                              className="save-team-btn"
                              onClick={() => handleSaveTeamMember(member)}
                              title="Salvar membro"
                              disabled={isViewOnly}
                            >
                              Salvar
                            </button>
                            <button
                              type="button"
                              className="delete-team-btn"
                              onClick={() => handleDeleteTeamMember(member.id)}
                              title="Deletar membro"
                              disabled={isViewOnly}
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </form>
            )}

            {currentStep === 5 && (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <p className="label-info">
                    • Qual é o Produto e/ou Serviço a ser oferecido?<br />
                    • Quais as principais características do Produto e/ou Serviço?<br />
                    • Em que estágio do Ciclo de Vida se encontra? Desenvolvimento, Introdução no Mercado, Crescimento no Mercado, Maturidade ou Declínio.<br />
                    • Qual a demanda do marcado que Produto e/ou Serviço irá resolver?<br />
                    • O Produto e/ou Serviço proposto neste negócio caracteriza-se como uma "inovação de produto", "inovação de processo", "inovação de marketing", "inovação organizacional"? Explique.
                  </p>
                  <textarea
                    id="produtoServico"
                    name="produtoServico"
                    value={formData.produtoServico}
                    onChange={handleChange}
                    placeholder="Descreva o planejamento/desenvolvimento do produto e/ou serviço"
                    rows="15"
                    disabled={isViewOnly}
                  />
                </div>

              </form>
            )}

            {currentStep === 6 && (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <h4>Análise dos consumidores/clientes. No texto, você deverá responder:</h4>
                  <br></br>
                  <p className="label-info">
                    • Quais serão os seus fornecedores do seu negócio no presente e/ou futuro?<br />
                    • Onde estão localizados os principais fornecedores do seu negócio?
                  </p>
                  <textarea
                    id="analiseFornecedores"
                    name="analiseFornecedores"
                    value={formData.analiseFornecedores}
                    onChange={handleChange}
                    placeholder="Descreva a análise dos fornecedores"
                    rows="15"
                    disabled={isViewOnly}
                  />
                </div>

                <div className="form-group">
                  <h4>Análise dos concorrentes. No texto, você deverá responder:</h4>
                  <br></br>
                  <p className="label-info">
                    • Identifique os principais concorrentes do seu negócio. Indique àqueles que são concorrentes diretos (que tem produtos e/ou serviços iguais ou similares aos que você irá oferecer) e os concorrentes indiretos (que não fazem exatamente o mesmo que você, mas podem substituir o seu produto e/ou serviço no mercado).<br />
                    • Indique o diferencial competitivo do seu negócio em comparação com os demais concorrentes.
                  </p>
                  <textarea
                    id="analiseCompetidores"
                    name="analiseCompetidores"
                    value={formData.analiseCompetidores}
                    onChange={handleChange}
                    placeholder="Descreva a análise dos concorrentes"
                    rows="15"
                    disabled={isViewOnly}
                  />
                </div>

                <div className="form-group">
                  <h4> Análise dos fornecedores. No texto, você deverá responder:</h4>
                  <br></br>
                  <p className="label-info">
                    • Qual o segmento de clientes seu negócio irá atender? Pessoas físicas e/ou Jurídicas? Por que?<br />
                    • Qual(is) variável(is) serão utilizadas para segmentar o mercado? Explique.<br />
                    (Demográfica, Geográfica, Psicográfica e Comportamental)<br />
                    • Identifique o público-alvo que o negócio espera atingir.
                  </p>
                  <textarea
                    id="planejamentoMercado"
                    name="planejamentoMercado"
                    value={formData.planejamentoMercado}
                    onChange={handleChange}
                    placeholder="Descreva o planejamento das ações do mercado"
                    rows="15"
                    disabled={isViewOnly}
                  />
                </div>

                <div className="file-upload-section">
                  <label htmlFor="file-input" className="file-upload-label">
                    Enviar arquivos
                  </label>
                  <input
                    type="file"
                    id="file-input"
                    multiple
                    onChange={handleFileUpload}
                    className="file-input"
                    disabled={isViewOnly}
                  />

                  {uploadedFiles.length > 0 && (
                    <div className="uploaded-files-list">
                      <h4>Arquivos Enviados:</h4>
                      <ul>
                        {uploadedFiles.map((file, index) => (
                          <li key={index} className="file-item">
                            <span>{file.name}</span>
                            <button
                              type="button"
                              className="delete-file-btn"
                              onClick={() => handleDeleteFile(index)}
                              title="Deletar arquivo"
                              disabled={isViewOnly}
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

              </form>
            )}

            {currentStep === 7 && (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <p className="label-info">
                    Descreva a estratégia de Marketing do seu negócio (4Ps + 3Ps). No texto, você deverá descrever:<br />
                    • Produto<br />
                    • Preço<br />
                    • Praça<br />
                    • Promoção<br />
                    • People (Pessoas)<br />
                    • Process (Processos)<br />
                    • Physical Evidence (Evidências Físicas)
                  </p>
                  <textarea
                    id="estrategiaMarketing"
                    name="estrategiaMarketing"
                    value={formData.estrategiaMarketing}
                    onChange={handleChange}
                    placeholder="Descreva a estratégia de Marketing do seu negócio"
                    rows="15"
                    disabled={isViewOnly}
                  />
                </div>

              </form>
            )}

            {currentStep === 8 && (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <p className="label-info">
                    Escreva como serão executadas as principais operações na sua empresa. No texto, você deverá responder:<br />
                    • Construa o organograma para a sua startup. Insira no organograma os cargos contidos na sua startup. Explique por meio de tópicos a função que será realizada por cada cargo.<br />
                    • Construa o(s) fluxograma(s) para demonstrar como será(ão) a(s) principal(is) operação(ões) da startup.<br />
                    • Descreva como será a venda dos Produtos e/ou Serviços (física ou online).<br />
                    • Construa um cronograma de operações das próximas atividades da sua empresa ou startup.
                  </p>
                  <textarea
                    id="planejamentoEstrutura"
                    name="planejamentoEstrutura"
                    value={formData.planejamentoEstrutura}
                    onChange={handleChange}
                    placeholder="Descreva o planejamento da estrutura, gerência e operações"
                    rows="15"
                    disabled={isViewOnly}
                  />
                </div>

              </form>
            )}

            {currentStep === 9 && (
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <p className="label-info">
                    Construa o planejamento financeiro.<br />
                    • Utilize a planilha Excel para desenvolver o planejamento financeiro para o seu negócio.
                  </p>
                </div>

                <div className="file-upload-section">
                  <label htmlFor="file-input-9" className="file-upload-label">
                    Enviar arquivos
                  </label>
                  <input
                    type="file"
                    id="file-input-9"
                    multiple
                    onChange={handleFileUpload}
                    className="file-input"
                    disabled={isViewOnly}
                  />

                  {uploadedFiles.length > 0 && (
                    <div className="uploaded-files-list">
                      <h4>Arquivos Enviados:</h4>
                      <ul>
                        {uploadedFiles.map((file, index) => (
                          <li key={index} className="file-item">
                            <span>{file.name}</span>
                            <button
                              type="button"
                              className="delete-file-btn"
                              onClick={() => handleDeleteFile(index)}
                              title="Deletar arquivo"
                              disabled={isViewOnly}
                            >
                              ×
                            </button>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

              </form>
            )}
          </div>
            </>
          )}
        </div>

        {isConsultor && (
          <>
            {!isViewOnly ? (
              <div className="nota-section">
                <h3>📝 Nota:</h3>
                <div className="rating-section">
                  <label>Avaliação:</label>
                  <div className="rating-options">
                    {[
                      { value: 1, label: 'Ruim' },
                      { value: 2, label: 'Razoável' },
                      { value: 3, label: 'Bom' },
                      { value: 4, label: 'Muito Bom' },
                      { value: 5, label: 'Excelente' }
                    ].map((item) => (
                      <label key={item.value} className="rating-label">
                        <input
                          type="radio"
                          name={`rating-${currentStep}`}
                          value={item.value}
                          checked={notes[currentStep]?.rating === item.value}
                          onChange={(e) => setNotes({ ...notes, [currentStep]: { ...notes[currentStep], rating: item.value } })}
                          disabled={isViewOnly}
                        />
                        <span className="rating-label-text">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <textarea
                  value={notes[currentStep]?.text || ''}
                  onChange={(e) => setNotes({ ...notes, [currentStep]: { ...notes[currentStep], text: e.target.value } })}
                  placeholder="Adicione suas notas e observações sobre este passo..."
                  className="nota-textarea"
                  rows="5"
                />
                {notes[currentStep]?.consultorEmail && (
                  <div className="nota-footer">
                    <span className="nota-user">Consultor: {notes[currentStep]?.consultorEmail}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="nota-section nota-view-only">
                <h3>📝 Nota:</h3>
                <div className="rating-section">
                  <label>Avaliação:</label>
                  <div className="rating-options">
                    {[
                      { value: 1, label: 'Ruim' },
                      { value: 2, label: 'Razoável' },
                      { value: 3, label: 'Bom' },
                      { value: 4, label: 'Muito Bom' },
                      { value: 5, label: 'Excelente' }
                    ].map((item) => (
                      <label key={item.value} className="rating-label">
                        <input
                          type="radio"
                          name={`rating-${currentStep}`}
                          value={item.value}
                          checked={notes[currentStep]?.rating === item.value}
                          onChange={() => setNotes({ ...notes, [currentStep]: { ...notes[currentStep], rating: item.value } })}
                        />
                        <span className="rating-label-text">{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <textarea
                  value={notes[currentStep]?.text || ''}
                  onChange={(e) => setNotes({ ...notes, [currentStep]: { ...notes[currentStep], text: e.target.value } })}
                  placeholder="Adicione suas notas e observações sobre este passo..."
                  className="nota-textarea"
                  rows="5"
                />
                {notes[currentStep]?.consultorEmail && (
                  <div className="nota-footer">
                    <span className="nota-user">Consultor: {notes[currentStep]?.consultorEmail}</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>Enviando dados...</p>
        </div>
      )}

      <div className="button-section">
        <button
          type="button"
          className="back-btn"
          onClick={() => {
            if (isViewOnly) {
              navigate('/dashboard', {
                state: { scrollToAprovar: true },
                replace: false
              })
            } else if (currentStep > 1) {
              setCurrentStep(currentStep - 1)
            }
          }}
          disabled={isViewOnly ? false : currentStep === 1 || isLoading}
        >
          {isViewOnly ? 'Voltar ao Dashboard' : 'Voltar'}
        </button>
        <button
          type="submit"
          className="submit-btn"
          onClick={handleSubmit}
          disabled={isViewOnly || !isStepComplete(currentStep) || isLoading}
        >
          {currentStep === 9 ? 'Enviar' : 'Próximo'}
        </button>
      </div>
    </div>
    </DashboardLayout>
  )
}

export default QuestionarioForm
