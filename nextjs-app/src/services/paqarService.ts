
// Service for Correo Argentino (Paq.ar) integration
// Documentation: https://api.correoargentino.com.ar/paqar/v1/

export interface PaqarLabelData {
  sender: {
    nombre: string
    calle: string
    numero: string
    localidad: string
    provincia: string
    cp: string
  }
  receiver: {
    nombre: string
    email: string
    telefono?: string
    calle: string
    numero: string
    localidad: string
    provincia: string
    cp: string
  }
  package: {
    peso: number // kg
    largo: number // cm
    ancho: number // cm
    alto: number // cm
    valorDeclarado: number
  }
  trackingNumber: string
  labelUrl?: string // URL to PDF if available
  productType: 'CP' | 'EP' // CP: Clásica, EP: Expreso, etc.
}

const MOCK_DELAY = 1500

export const paqarService = {
  // Default Config
  config: {
    baseUrl: process.env.PAQAR_API_URL || 'https://api.correoargentino.com.ar/paqar/v1',
    apiKey: process.env.PAQAR_API_KEY,
    secret: process.env.PAQAR_SECRET
  },

  // Authenticate
  async authenticate(config: any): Promise<string> {
    if (!config.apiKey) {
      console.warn('Paq.ar: Missing API Key - Using Mock Authentication (Fallback)')
      return 'mock-token'
    }

    try {
      const res = await fetch(`${config.baseUrl}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: config.apiKey,
          secret: config.secret
        })
      })
      
      if (!res.ok) {
          const errText = await res.text()
          throw new Error(`Paq.ar Auth Failed: ${res.status} ${errText}`)
      }
      const data = await res.json()
      return data.token
    } catch (error) {
      console.error('Paq.ar Auth Error:', error)
      throw error
    }
  },

  // Create Shipment (Imposicion)
  async createShipment(order: any, senderOverride?: any, configOverride?: any): Promise<PaqarLabelData> {
    // Merge config
    const config = { ...this.config, ...configOverride }
    
    const token = await this.authenticate(config)

    // Determine sender data (override or default)
    const sender = senderOverride || {
      nombre: 'Urban CDG Official',
      calle: 'Av. Corrientes',
      numero: '1234',
      localidad: 'CABA',
      provincia: 'CABA',
      cp: '1000'
    }

    // Parse address
    const addressParts = (order.direccion_envio || '').split(' ')
    const number = addressParts.length > 1 ? addressParts.pop() : 'S/N'
    const street = addressParts.join(' ') || order.direccion_envio || 'Calle Principal'

    const shipmentData = {
      sender,
      receiver: {
        nombre: order.cliente_nombre || 'Cliente',
        email: order.cliente_email,
        telefono: order.cliente_telefono,
        calle: street,
        numero: number,
        localidad: order.ciudad || order.envio_ciudad || 'Ciudad',
        provincia: order.provincia || order.envio_provincia || 'Provincia',
        cp: order.codigo_postal || order.envio_codigo_postal || '0000'
      },
      package: {
        peso: 1.0, // Default 1kg
        largo: 40,
        ancho: 30,
        alto: 10,
        valorDeclarado: order.total || 0
      },
      productType: 'CP' as const
    }

    if (token === 'mock-token') {
      await new Promise(resolve => setTimeout(resolve, MOCK_DELAY))
      return {
        ...shipmentData,
        trackingNumber: `CP${Math.floor(Math.random() * 1000000000)}AR`
      }
    }

    // Real API Call
    try {
      const res = await fetch(`${config.baseUrl}/imposicion`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(shipmentData)
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`Paq.ar Create Shipment Failed: ${res.status} ${errText}`)
      }
      const data = await res.json()
      
      return {
        ...shipmentData,
        trackingNumber: data.trackingNumber || data.numero,
        labelUrl: data.labelUrl || data.etiqueta
      }
    } catch (error) {
      console.error('Paq.ar Create Shipment Error:', error)
      throw error
    }
  },

  // Helper to generate the Label HTML for printing (Client-side use mostly)
  generateLabelHtml(data: PaqarLabelData): string {
    return `
      <html>
        <head>
          <title>Etiqueta Paq.ar - ${data.trackingNumber}</title>
          <style>
            body { font-family: 'Arial', sans-serif; padding: 0; margin: 0; }
            .label-page { 
              width: 100mm; 
              height: 150mm; 
              border: 1px dashed #000; 
              margin: 20px auto; 
              padding: 15px;
              box-sizing: border-box;
              position: relative;
            }
            .header { 
              display: flex; 
              justify-content: space-between; 
              align-items: center; 
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }
            .logo { font-weight: 900; font-size: 24px; font-style: italic; color: #004b8d; }
            .service-type { font-size: 32px; font-weight: bold; border: 2px solid #000; padding: 2px 10px; }
            
            .row { display: flex; margin-bottom: 10px; }
            .col { flex: 1; }
            
            .box { 
              border: 1px solid #000; 
              padding: 5px; 
              min-height: 80px;
              margin-bottom: 5px;
            }
            .box-title { font-size: 10px; font-weight: bold; text-transform: uppercase; margin-bottom: 5px; }
            .box-content { font-size: 12px; line-height: 1.4; }
            .bold { font-weight: bold; }
            
            .barcode-area { 
              text-align: center; 
              margin-top: 20px; 
              border-top: 2px solid #000;
              padding-top: 10px;
            }
            .barcode-lines { 
              height: 60px; 
              background: repeating-linear-gradient(to right, #000, #000 2px, #fff 2px, #fff 5px);
              width: 90%;
              margin: 0 auto 5px auto;
            }
            .tracking-code { font-size: 14px; font-weight: bold; letter-spacing: 2px; }
            
            .footer { font-size: 9px; text-align: center; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="label-page">
            <div class="header">
              <div class="logo">Correo Argentino</div>
              <div class="service-type">${data.productType}</div>
            </div>
            
            <div class="box">
              <div class="box-title">DESTINATARIO</div>
              <div class="box-content">
                <span class="bold">${data.receiver.nombre}</span><br>
                ${data.receiver.calle} ${data.receiver.numero}<br>
                ${data.receiver.localidad} (${data.receiver.cp})<br>
                ${data.receiver.provincia}
              </div>
            </div>

            <div class="box" style="min-height: 60px;">
              <div class="box-title">REMITENTE</div>
              <div class="box-content">
                <span class="bold">${data.sender.nombre}</span><br>
                ${data.sender.calle} ${data.sender.numero}<br>
                ${data.sender.localidad} (${data.sender.cp})
              </div>
            </div>

            <div class="row">
              <div class="col" style="margin-right: 5px;">
                 <div class="box" style="min-height: 40px;">
                    <div class="box-title">PESO (KG)</div>
                    <div class="box-content bold" style="font-size: 16px;">${data.package.peso}</div>
                 </div>
              </div>
              <div class="col">
                 <div class="box" style="min-height: 40px;">
                    <div class="box-title">PEDIDO</div>
                    <div class="box-content bold">${data.trackingNumber.substring(0,8)}</div>
                 </div>
              </div>
            </div>

            <div class="barcode-area">
              <div class="barcode-lines"></div>
              <div class="tracking-code">${data.trackingNumber}</div>
            </div>

            <div class="footer">
              PAQ.AR - Powered by Urban CDG<br>
              ${new Date().toLocaleString()}
            </div>
          </div>
          <script>window.onload = function() { window.print(); }</script>
        </body>
      </html>
    `
  }
}
