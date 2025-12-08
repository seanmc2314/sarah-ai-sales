import fs from 'fs'
import path from 'path'

export interface LocalSupremeOneContent {
  id: string
  title: string
  content: string
  contentType: 'training_data' | 'fi_expertise' | 'html_interface' | 'roleplay_scenario' | 'coaching_data'
  category: string
  tags: string[]
  filePath: string
  lastModified: Date
  fileType: 'json' | 'html' | 'js' | 'md'
}

export interface SupremeOneScreenshot {
  filename: string
  interface: string
  description: string
  path: string
  timestamp: Date
}

export interface FIExpertiseData {
  practice_tags: string[]
  compliance_tags: string[]
  objection_types: string[]
  roleplay_scenarios: string[]
  coaching_tips: any[]
  knowledge_base: any[]
}

export class LocalSupremeOnePlatformService {
  private platformPath: string

  constructor(platformPath: string = '/Users/seanmcnally/Desktop/supreme-one-platform') {
    this.platformPath = platformPath
  }

  async extractAllContent(): Promise<LocalSupremeOneContent[]> {
    const content: LocalSupremeOneContent[] = []

    try {
      // Extract F&I expertise data
      const fiData = await this.extractFIExpertise()
      content.push(...fiData)

      // Extract training data
      const trainingData = await this.extractTrainingData()
      content.push(...trainingData)

      // Extract HTML interfaces
      const htmlInterfaces = await this.extractHTMLInterfaces()
      content.push(...htmlInterfaces)

      // Extract coaching engines
      const coachingData = await this.extractCoachingData()
      content.push(...coachingData)

      return content

    } catch (error) {
      console.error('Error extracting Supreme One content:', error)
      throw new Error('Failed to extract platform content')
    }
  }

  private async extractFIExpertise(): Promise<LocalSupremeOneContent[]> {
    const content: LocalSupremeOneContent[] = []

    try {
      // Read F&I expert dataset
      const fiDataPath = path.join(this.platformPath, 'data/fi-expert-dataset.json')
      if (fs.existsSync(fiDataPath)) {
        const fiData = JSON.parse(fs.readFileSync(fiDataPath, 'utf8'))

        content.push({
          id: 'fi-expert-dataset',
          title: 'F&I Expert Dataset',
          content: JSON.stringify(fiData),
          contentType: 'fi_expertise',
          category: 'expertise',
          tags: ['f&i', 'compliance', 'objections', 'roleplay'],
          filePath: fiDataPath,
          lastModified: fs.statSync(fiDataPath).mtime,
          fileType: 'json'
        })
      }

      // Read Sarah training complete
      const sarahDataPath = path.join(this.platformPath, 'data/sarah-training-complete.json')
      if (fs.existsSync(sarahDataPath)) {
        const sarahData = JSON.parse(fs.readFileSync(sarahDataPath, 'utf8'))

        content.push({
          id: 'sarah-training-complete',
          title: 'Sarah AI Complete Training Dataset',
          content: JSON.stringify(sarahData),
          contentType: 'training_data',
          category: 'ai_training',
          tags: ['sarah', 'coaching', 'f&i', 'training'],
          filePath: sarahDataPath,
          lastModified: fs.statSync(sarahDataPath).mtime,
          fileType: 'json'
        })
      }

      // Read F&I knowledge base
      const fiKnowledgePath = path.join(this.platformPath, 'fi-knowledge-database.js')
      if (fs.existsSync(fiKnowledgePath)) {
        const fiKnowledge = fs.readFileSync(fiKnowledgePath, 'utf8')

        content.push({
          id: 'fi-knowledge-database',
          title: 'F&I Knowledge Database',
          content: fiKnowledge,
          contentType: 'fi_expertise',
          category: 'knowledge_base',
          tags: ['f&i', 'database', 'expertise'],
          filePath: fiKnowledgePath,
          lastModified: fs.statSync(fiKnowledgePath).mtime,
          fileType: 'js'
        })
      }

      return content

    } catch (error) {
      console.error('Error extracting F&I expertise:', error)
      return []
    }
  }

  private async extractTrainingData(): Promise<LocalSupremeOneContent[]> {
    const content: LocalSupremeOneContent[] = []

    try {
      const trainingDataDir = path.join(this.platformPath, 'training-data')

      if (fs.existsSync(trainingDataDir)) {
        const files = fs.readdirSync(trainingDataDir)

        for (const file of files) {
          if (file.endsWith('.js') || file.endsWith('.json')) {
            const filePath = path.join(trainingDataDir, file)
            const fileContent = fs.readFileSync(filePath, 'utf8')

            content.push({
              id: `training-${file.replace(/\.[^/.]+$/, "")}`,
              title: `Training Data: ${file}`,
              content: fileContent,
              contentType: 'training_data',
              category: 'training',
              tags: ['training', 'dataset'],
              filePath,
              lastModified: fs.statSync(filePath).mtime,
              fileType: file.endsWith('.js') ? 'js' : 'json'
            })
          }
        }
      }

      return content

    } catch (error) {
      console.error('Error extracting training data:', error)
      return []
    }
  }

  private async extractHTMLInterfaces(): Promise<LocalSupremeOneContent[]> {
    const content: LocalSupremeOneContent[] = []

    try {
      const publicDir = path.join(this.platformPath, 'public')
      const htmlFiles = [
        'dashboard.html',
        'deals.html',
        'roleplay-interface.html',
        'fi-testing-interface.html',
        'knowledge-manager.html',
        'reports.html'
      ]

      for (const file of htmlFiles) {
        const filePath = path.join(publicDir, file)
        if (fs.existsSync(filePath)) {
          const htmlContent = fs.readFileSync(filePath, 'utf8')

          // Extract meaningful content from HTML
          const title = this.extractHTMLTitle(htmlContent)
          const description = this.extractHTMLDescription(htmlContent)

          content.push({
            id: `interface-${file.replace('.html', '')}`,
            title: title || `${file} Interface`,
            content: description,
            contentType: 'html_interface',
            category: 'interface',
            tags: ['html', 'interface', 'ui'],
            filePath,
            lastModified: fs.statSync(filePath).mtime,
            fileType: 'html'
          })
        }
      }

      return content

    } catch (error) {
      console.error('Error extracting HTML interfaces:', error)
      return []
    }
  }

  private async extractCoachingData(): Promise<LocalSupremeOneContent[]> {
    const content: LocalSupremeOneContent[] = []

    try {
      const coachingFiles = [
        'passionate-consulting-engine.js',
        'sarah-learning-engine.js',
        'sarah-master-coach-enhanced.js',
        'sarah-expert-analyst.js',
        'transformational-coaching-engine.js'
      ]

      for (const file of coachingFiles) {
        const filePath = path.join(this.platformPath, file)
        if (fs.existsSync(filePath)) {
          const fileContent = fs.readFileSync(filePath, 'utf8')

          content.push({
            id: `coaching-${file.replace('.js', '')}`,
            title: `Coaching Engine: ${file}`,
            content: fileContent,
            contentType: 'coaching_data',
            category: 'coaching',
            tags: ['coaching', 'engine', 'ai'],
            filePath,
            lastModified: fs.statSync(filePath).mtime,
            fileType: 'js'
          })
        }
      }

      return content

    } catch (error) {
      console.error('Error extracting coaching data:', error)
      return []
    }
  }

  async captureInterfaceScreenshots(): Promise<SupremeOneScreenshot[]> {
    // Screenshots disabled for now - would require puppeteer setup
    console.log('Screenshots feature disabled - puppeteer not available')
    return []
  }

  async getFIExpertiseData(): Promise<FIExpertiseData> {
    try {
      const fiDataPath = path.join(this.platformPath, 'data/fi-expert-dataset.json')

      if (fs.existsSync(fiDataPath)) {
        const data = JSON.parse(fs.readFileSync(fiDataPath, 'utf8'))

        return {
          practice_tags: data.taxonomies?.practice_tags || [],
          compliance_tags: data.taxonomies?.compliance_tags || [],
          objection_types: data.taxonomies?.objection_types || [],
          roleplay_scenarios: data.taxonomies?.roleplay_scenarios || [],
          coaching_tips: data.coaching_tips || [],
          knowledge_base: data.knowledge_base || []
        }
      }

      return {
        practice_tags: [],
        compliance_tags: [],
        objection_types: [],
        roleplay_scenarios: [],
        coaching_tips: [],
        knowledge_base: []
      }

    } catch (error) {
      console.error('Error getting F&I expertise data:', error)
      throw new Error('Failed to get F&I expertise data')
    }
  }

  async getTrainingContent(category?: string): Promise<LocalSupremeOneContent[]> {
    const allContent = await this.extractAllContent()

    if (category) {
      return allContent.filter(item =>
        item.category === category ||
        item.tags.includes(category.toLowerCase())
      )
    }

    return allContent
  }

  async searchContent(query: string): Promise<LocalSupremeOneContent[]> {
    const allContent = await this.extractAllContent()
    const searchTerms = query.toLowerCase().split(' ')

    return allContent.filter(item => {
      const searchableText = `${item.title} ${item.content} ${item.tags.join(' ')}`.toLowerCase()
      return searchTerms.some(term => searchableText.includes(term))
    })
  }

  private extractHTMLTitle(html: string): string {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
    if (titleMatch) return titleMatch[1]

    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/i)
    if (h1Match) return h1Match[1]

    return ''
  }

  private extractHTMLDescription(html: string): string {
    // Remove HTML tags and extract meaningful text
    const textContent = html
      .replace(/<script[^>]*>.*?<\/script>/gis, '')
      .replace(/<style[^>]*>.*?<\/style>/gis, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()

    return textContent.substring(0, 500) + (textContent.length > 500 ? '...' : '')
  }

  async getInterfacesList(): Promise<string[]> {
    const publicDir = path.join(this.platformPath, 'public')

    if (!fs.existsSync(publicDir)) {
      return []
    }

    return fs.readdirSync(publicDir)
      .filter(file => file.endsWith('.html'))
      .map(file => file.replace('.html', ''))
  }

  async getFileContent(relativePath: string): Promise<string> {
    const fullPath = path.join(this.platformPath, relativePath)

    if (!fs.existsSync(fullPath)) {
      throw new Error(`File not found: ${relativePath}`)
    }

    return fs.readFileSync(fullPath, 'utf8')
  }
}