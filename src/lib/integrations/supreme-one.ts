import axios from 'axios'
import * as cheerio from 'cheerio'
import puppeteer from 'puppeteer'

export interface SupremeOneContent {
  title: string
  content: string
  url: string
  lastUpdated: Date
  contentType: 'training_module' | 'case_study' | 'testimonial' | 'program_info' | 'curriculum'
  category: string
  tags: string[]
}

export interface PlatformScreenshot {
  url: string
  filename: string
  description: string
  timestamp: Date
  element?: string // CSS selector for specific element
}

export interface ProgramDemo {
  title: string
  description: string
  steps: DemoStep[]
  duration: number
  screenshots: string[]
}

export interface DemoStep {
  action: string
  description: string
  screenshot?: string
  narration: string
}

export class SupremeOnePlatformService {
  private baseUrl: string
  private credentials?: {
    username: string
    password: string
  }

  constructor(baseUrl: string, credentials?: { username: string; password: string }) {
    this.baseUrl = baseUrl
    this.credentials = credentials
  }

  async extractPlatformContent(): Promise<SupremeOneContent[]> {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
      const page = await browser.newPage()

      // Set realistic user agent
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')

      const content: SupremeOneContent[] = []

      // Login if credentials provided
      if (this.credentials) {
        await this.loginToPlatform(page)
      }

      // Discover content pages
      const contentUrls = await this.discoverContentPages(page)

      for (const url of contentUrls) {
        try {
          await page.goto(url, { waitUntil: 'networkidle2' })

          const pageContent = await this.extractPageContent(page, url)
          if (pageContent) {
            content.push(pageContent)
          }
        } catch (error) {
          console.error(`Error extracting content from ${url}:`, error)
        }
      }

      await browser.close()
      return content

    } catch (error) {
      console.error('Error extracting platform content:', error)
      throw new Error('Failed to extract platform content')
    }
  }

  private async loginToPlatform(page: any): Promise<void> {
    if (!this.credentials) return

    try {
      // Navigate to login page (adjust selectors based on actual platform)
      await page.goto(`${this.baseUrl}/login`)

      // Fill login form
      await page.waitForSelector('input[type="email"], input[name="username"], input[name="email"]', { timeout: 5000 })
      await page.type('input[type="email"], input[name="username"], input[name="email"]', this.credentials.username)

      await page.waitForSelector('input[type="password"], input[name="password"]', { timeout: 5000 })
      await page.type('input[type="password"], input[name="password"]', this.credentials.password)

      // Submit form
      const submitButton = await page.$('button[type="submit"], input[type="submit"], .login-button, .submit-btn')
      if (submitButton) {
        await submitButton.click()
        await page.waitForNavigation({ waitUntil: 'networkidle2' })
      }

    } catch (error) {
      console.error('Login failed:', error)
      throw new Error('Failed to login to platform')
    }
  }

  private async discoverContentPages(page: any): Promise<string[]> {
    const urls = new Set<string>()

    try {
      // Navigate to main platform areas
      const mainPages = [
        `${this.baseUrl}`,
        `${this.baseUrl}/training`,
        `${this.baseUrl}/modules`,
        `${this.baseUrl}/curriculum`,
        `${this.baseUrl}/programs`,
        `${this.baseUrl}/courses`,
        `${this.baseUrl}/content`,
        `${this.baseUrl}/resources`
      ]

      for (const mainPage of mainPages) {
        try {
          await page.goto(mainPage, { waitUntil: 'networkidle2', timeout: 10000 })

          // Extract all internal links
          const links = await page.evaluate((baseUrl: string) => {
            const anchors = Array.from(document.querySelectorAll('a[href]'))
            return anchors
              .map(a => (a as HTMLAnchorElement).href)
              .filter(href => href.startsWith(baseUrl))
              .filter(href => !href.includes('#'))
              .filter(href => !href.includes('?'))
          }, this.baseUrl)

          links.forEach(link => urls.add(link))

        } catch (error) {
          console.warn(`Could not access ${mainPage}:`, error)
        }
      }

    } catch (error) {
      console.error('Error discovering content pages:', error)
    }

    return Array.from(urls).slice(0, 50) // Limit to prevent overload
  }

  private async extractPageContent(page: any, url: string): Promise<SupremeOneContent | null> {
    try {
      const content = await page.evaluate(() => {
        // Extract title
        const title = document.querySelector('h1, .title, .course-title, .module-title')?.textContent?.trim() ||
                     document.title

        // Extract main content
        const contentSelectors = [
          '.content',
          '.course-content',
          '.module-content',
          '.training-content',
          'main',
          '.main-content',
          'article',
          '.description'
        ]

        let mainContent = ''
        for (const selector of contentSelectors) {
          const element = document.querySelector(selector)
          if (element) {
            mainContent = element.textContent?.trim() || ''
            break
          }
        }

        // Extract metadata
        const category = document.querySelector('.category, .course-category, .module-category')?.textContent?.trim() || 'general'

        // Extract tags/keywords
        const tags: string[] = []
        const tagElements = document.querySelectorAll('.tag, .keyword, .category-tag')
        tagElements.forEach(el => {
          const tag = el.textContent?.trim()
          if (tag) tags.push(tag)
        })

        return {
          title,
          content: mainContent,
          category,
          tags
        }
      })

      if (!content.title || !content.content) {
        return null
      }

      // Determine content type based on URL and content
      let contentType: SupremeOneContent['contentType'] = 'program_info'
      if (url.includes('/training/') || url.includes('/module/')) {
        contentType = 'training_module'
      } else if (url.includes('/case-study/') || content.content.toLowerCase().includes('case study')) {
        contentType = 'case_study'
      } else if (url.includes('/testimonial/') || content.content.toLowerCase().includes('testimonial')) {
        contentType = 'testimonial'
      } else if (url.includes('/curriculum/')) {
        contentType = 'curriculum'
      }

      return {
        title: content.title,
        content: content.content,
        url,
        lastUpdated: new Date(),
        contentType,
        category: content.category,
        tags: content.tags
      }

    } catch (error) {
      console.error(`Error extracting content from page ${url}:`, error)
      return null
    }
  }

  async captureScreenshots(urls: string[], options?: {
    fullPage?: boolean
    elementSelector?: string
    description?: string
  }): Promise<PlatformScreenshot[]> {
    const screenshots: PlatformScreenshot[] = []

    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
      const page = await browser.newPage()
      await page.setViewport({ width: 1920, height: 1080 })

      // Login if needed
      if (this.credentials) {
        await this.loginToPlatform(page)
      }

      for (const url of urls) {
        try {
          await page.goto(url, { waitUntil: 'networkidle2' })

          const timestamp = new Date()
          const filename = `screenshot_${timestamp.getTime()}.png`
          const screenshotPath = `/tmp/${filename}`

          if (options?.elementSelector) {
            // Screenshot specific element
            const element = await page.$(options.elementSelector)
            if (element) {
              await element.screenshot({ path: screenshotPath })
            }
          } else {
            // Full page screenshot
            await page.screenshot({
              path: screenshotPath,
              fullPage: options?.fullPage || false
            })
          }

          screenshots.push({
            url,
            filename,
            description: options?.description || `Screenshot of ${url}`,
            timestamp,
            element: options?.elementSelector
          })

        } catch (error) {
          console.error(`Error capturing screenshot for ${url}:`, error)
        }
      }

      await browser.close()
      return screenshots

    } catch (error) {
      console.error('Error capturing screenshots:', error)
      throw new Error('Failed to capture screenshots')
    }
  }

  async createProgramDemo(demoConfig: {
    startUrl: string
    steps: Array<{
      action: string
      selector?: string
      description: string
      narration: string
    }>
  }): Promise<ProgramDemo> {
    try {
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      })
      const page = await browser.newPage()
      await page.setViewport({ width: 1920, height: 1080 })

      // Login if needed
      if (this.credentials) {
        await this.loginToPlatform(page)
      }

      await page.goto(demoConfig.startUrl, { waitUntil: 'networkidle2' })

      const screenshots: string[] = []
      const steps: DemoStep[] = []
      const startTime = Date.now()

      for (let i = 0; i < demoConfig.steps.length; i++) {
        const stepConfig = demoConfig.steps[i]

        try {
          // Perform the action
          if (stepConfig.selector) {
            await page.waitForSelector(stepConfig.selector, { timeout: 5000 })

            if (stepConfig.action === 'click') {
              await page.click(stepConfig.selector)
            } else if (stepConfig.action === 'type') {
              await page.type(stepConfig.selector, 'Demo Value')
            } else if (stepConfig.action === 'hover') {
              await page.hover(stepConfig.selector)
            }

            // Wait for any animations/changes
            await page.waitForTimeout(1000)
          }

          // Capture screenshot
          const filename = `demo_step_${i + 1}_${Date.now()}.png`
          const screenshotPath = `/tmp/${filename}`
          await page.screenshot({ path: screenshotPath, fullPage: false })

          screenshots.push(filename)

          steps.push({
            action: stepConfig.action,
            description: stepConfig.description,
            screenshot: filename,
            narration: stepConfig.narration
          })

        } catch (error) {
          console.error(`Error in demo step ${i + 1}:`, error)
        }
      }

      await browser.close()

      const duration = Math.round((Date.now() - startTime) / 1000)

      return {
        title: 'Supreme One Platform Demonstration',
        description: 'Automated demonstration of platform features',
        steps,
        duration,
        screenshots
      }

    } catch (error) {
      console.error('Error creating program demo:', error)
      throw new Error('Failed to create program demo')
    }
  }

  async getLatestContent(categories?: string[]): Promise<SupremeOneContent[]> {
    // This would typically connect to an API or database
    // For now, we'll extract content live from the platform
    const allContent = await this.extractPlatformContent()

    if (categories && categories.length > 0) {
      return allContent.filter(content =>
        categories.some(cat =>
          content.category.toLowerCase().includes(cat.toLowerCase()) ||
          content.tags.some(tag => tag.toLowerCase().includes(cat.toLowerCase()))
        )
      )
    }

    return allContent.slice(0, 20) // Return latest 20 items
  }

  async searchContent(query: string): Promise<SupremeOneContent[]> {
    const allContent = await this.extractPlatformContent()
    const searchTerms = query.toLowerCase().split(' ')

    return allContent.filter(content => {
      const searchableText = `${content.title} ${content.content} ${content.tags.join(' ')}`.toLowerCase()
      return searchTerms.some(term => searchableText.includes(term))
    })
  }
}