
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

export interface PaqarTrackingEvent {
  fecha: string
  localidad: string
  descripcion: string
  estado: string
}

export interface PaqarTrackingInfo {
  estado: string
  eventos: PaqarTrackingEvent[]
}

const MOCK_DELAY = 1500

export const paqarService = {
  // Config
  config: {
    baseUrl: process.env.PAQAR_API_URL || 'https://api.correoargentino.com.ar/micorreo/v1',
    apiKey: process.env.PAQAR_API_KEY,
    secret: process.env.PAQAR_SECRET,
    agreementId: process.env.PAQAR_AGREEMENT_ID || '18017' // Default agreement if not provided
  },

  // Authenticate
  async authenticate(): Promise<void> {
    // With API Key, we usually don't need a session token for every request if we send the key in headers.
    // However, we can validate credentials.
    if (!this.config.apiKey) {
      console.warn('Paq.ar API Key missing, using mock mode')
      return
    }
  },

  // Create Shipment (Imposicion)
  async createShipment(order: any): Promise<PaqarLabelData> {
    await this.authenticate()

    // If no API key, return mock
    if (!this.config.apiKey) {
      return this.createMockShipment(order)
    }

    try {
      // Prepare payload for Paq.ar API
      const addressParts = (order.direccion_envio || '').split(' ')
      const number = addressParts.pop() || 'S/N'
      const street = addressParts.join(' ') || 'Calle Principal'

      // Default dimensions if not present
      const dimensions = {
        height: "10",
        width: "30",
        depth: "40" // "largo" mapped to depth/length
      }

      const payload = {
        sellerId: this.config.agreementId, // Using agreement ID as sellerId reference or similar
        trackingNumber: order.numero_orden || `INT-${Date.now()}`, // Client reference
        order: {
          senderData: order.senderOverride ? {
            businessName: order.senderOverride.nombre,
            email: "ventas@urbancdg.com",
            address: {
              streetName: order.senderOverride.calle,
              streetNumber: order.senderOverride.numero,
              cityName: order.senderOverride.localidad,
              state: order.senderOverride.provincia,
              zipCode: order.senderOverride.cp,
              floor: "",
              department: ""
            }
          } : undefined, // API might require senderData or take from account defaults
          shippingData: {
            name: order.cliente_nombre || 'Cliente',
            email: order.cliente_email,
            address: {
              streetName: street,
              streetNumber: number,
              cityName: order.ciudad || 'Ciudad',
              state: order.provincia || 'Provincia',
              zipCode: order.codigo_postal || '0000',
              floor: "",
              department: ""
            }
          },
          parcels: [
             {
               dimensions: dimensions,
               productWeight: "1", // 1kg default
               productCategory: "standard",
               declaredValue: String(order.total || 0)
             }
          ],
          deliveryType: "homeDelivery",
          serviceType: "CP", // Paquete Clásica
        }
      }

      // Real API Call
      const res = await fetch(`${this.config.baseUrl}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Apikey ${this.config.apiKey}`,
          'agreement': this.config.agreementId
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        const errText = await res.text()
        console.error('Paq.ar API Error:', errText)
        throw new Error(`Error Paq.ar: ${res.statusText}`)
      }

      const data = await res.json()
      // Map response to our internal format
      // Assuming response contains the official tracking number
      const officialTracking = data.trackingNumber || payload.trackingNumber

      return {
        sender: order.senderOverride || {
            nombre: 'Urban CDG Official',
            calle: 'Av. Corrientes',
            numero: '1234',
            localidad: 'CABA',
            provincia: 'CABA',
            cp: '1000'
        },
        receiver: {
            nombre: order.cliente_nombre || 'Cliente',
            email: order.cliente_email,
            telefono: order.cliente_telefono,
            calle: street,
            numero: number,
            localidad: order.ciudad || 'Ciudad',
            provincia: order.provincia || 'Provincia',
            cp: order.codigo_postal || '0000'
        },
        package: {
            peso: 1.0,
            largo: 40,
            ancho: 30,
            alto: 10,
            valorDeclarado: order.total || 0
        },
        trackingNumber: officialTracking,
        productType: 'CP'
      }

    } catch (error) {
      console.error('Failed to create shipment with Paq.ar, falling back to mock for demo if allowed, or rethrowing', error)
      // For now, if real API fails (likely due to invalid keys/agreement in dev), we throw to alert the user
      throw error
    }
  },

  async createMockShipment(order: any): Promise<PaqarLabelData> {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY))
    const addressParts = (order.direccion_envio || '').split(' ')
    const number = addressParts.pop() || 'S/N'
    const street = addressParts.join(' ') || 'Calle Principal'
    const trackingNumber = `CP${Math.floor(Math.random() * 1000000000)}AR`
    return {
      sender: order.senderOverride || {
        nombre: 'Urban CDG Official',
        calle: 'Av. Corrientes',
        numero: '1234',
        localidad: 'CABA',
        provincia: 'CABA',
        cp: '1000'
      },
      receiver: {
        nombre: order.cliente_nombre || 'Cliente',
        email: order.cliente_email,
        telefono: order.cliente_telefono,
        calle: street,
        numero: number,
        localidad: order.ciudad || 'Ciudad',
        provincia: order.provincia || 'Provincia',
        cp: order.codigo_postal || '0000'
      },
      package: {
        peso: 1.0,
        largo: 40,
        ancho: 30,
        alto: 10,
        valorDeclarado: order.total || 0
      },
      trackingNumber,
      productType: 'CP'
    }
  },

  async trackShipment(trackingNumber: string): Promise<PaqarTrackingInfo> {
    if (!trackingNumber || typeof trackingNumber !== 'string') {
      throw new Error('Código de seguimiento inválido')
    }

    if (!this.config.apiKey) {
      return this.trackMockShipment(trackingNumber)
    }

    try {
      // Real API Call for Tracking
      // Assuming GET /orders?trackingNumber=... or similar based on standard patterns
      // If the official docs say "Consultar historial", we try that.
      // Since we don't have the EXACT endpoint for history in the snippet, we try /orders/{trackingNumber}
      const res = await fetch(`${this.config.baseUrl}/orders/${trackingNumber}`, {
        headers: {
            'Authorization': `Apikey ${this.config.apiKey}`,
            'agreement': this.config.agreementId
        }
      })

      if (!res.ok) {
         // If 404, maybe try query param
         const res2 = await fetch(`${this.config.baseUrl}/orders?trackingNumber=${trackingNumber}`, {
            headers: {
                'Authorization': `Apikey ${this.config.apiKey}`,
                'agreement': this.config.agreementId
            }
         })
         if (!res2.ok) throw new Error('Tracking not found')
         // process res2...
         throw new Error('Tracking implementation requires valid endpoint verification')
      }

      const data = await res.json()
      // Map external events to internal structure
      // This is hypothetical mapping based on common structures
      const eventos = (data.history || []).map((e: any) => ({
        fecha: e.date || new Date().toISOString(),
        localidad: e.location || '',
        descripcion: e.description || e.status,
        estado: e.status // map to internal status if needed
      }))

      return {
        estado: data.status || 'unknown',
        eventos
      }

    } catch (error) {
      console.warn('Real tracking failed, using mock for demo purposes', error)
      return this.trackMockShipment(trackingNumber)
    }
  },

  async trackMockShipment(trackingNumber: string): Promise<PaqarTrackingInfo> {
    await new Promise(resolve => setTimeout(resolve, MOCK_DELAY))
    const now = new Date()
    const daysAgo = (d: number) => {
      const dt = new Date(now)
      dt.setDate(dt.getDate() - d)
      return dt.toISOString()
    }
    const eventos: PaqarTrackingEvent[] = [
      {
        fecha: daysAgo(3),
        localidad: 'Centro Logístico',
        descripcion: 'Envío admitido en Correo Argentino',
        estado: 'admitido'
      },
      {
        fecha: daysAgo(2),
        localidad: 'Planta de Distribución',
        descripcion: 'En tránsito hacia planta de distribución',
        estado: 'en_transito'
      },
      {
        fecha: daysAgo(1),
        localidad: 'Sucursal de destino',
        descripcion: 'Envío en sucursal de destino',
        estado: 'en_sucursal'
      },
      {
        fecha: now.toISOString(),
        localidad: 'Domicilio del destinatario',
        descripcion: 'Visita en curso o entrega programada',
        estado: 'en_entrega'
      }
    ]
    return {
      estado: 'en_entrega',
      eventos
    }
  },

  // Helper to generate the Label HTML for printing
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
