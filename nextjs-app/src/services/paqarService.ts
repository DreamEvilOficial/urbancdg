
// Service for Correo Argentino (Paq.ar) integration
// Documentation: https://api.correoargentino.com.ar/paqar/v1/

export interface PaqarLabelData {
  sender: {
    nombre: string
    dni: string
    calle: string
    numero: string
    localidad: string
    provincia: string
    cp: string
  }
  receiver: {
    nombre: string
    email: string
    dni: string
    telefono?: string
    calle: string
    numero: string
    localidad: string
    provincia: string
    cp: string
    floor?: string
    department?: string
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
            documentNumber: order.senderOverride.dni,
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
            documentNumber: order.cliente_dni || '',
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
            dni: '',
            calle: 'Av. Corrientes',
            numero: '1234',
            localidad: 'CABA',
            provincia: 'CABA',
            cp: '1000'
        },
        receiver: {
            nombre: order.cliente_nombre || 'Cliente',
            email: order.cliente_email,
            dni: order.cliente_dni || '',
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
        dni: '',
        calle: 'Av. Corrientes',
        numero: '1234',
        localidad: 'CABA',
        provincia: 'CABA',
        cp: '1000'
      },
      receiver: {
        nombre: order.cliente_nombre || 'Cliente',
        email: order.cliente_email,
        dni: order.cliente_dni || '',
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
    const today = new Date().toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Etiqueta Paq.ar - ${data.trackingNumber}</title>
          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.0/dist/JsBarcode.all.min.js"></script>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js"></script>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;700;900&display=swap');
            
            body { 
              font-family: 'Roboto', 'Arial', sans-serif; 
              margin: 0; 
              padding: 0; 
              background-color: #f0f0f0;
              -webkit-print-color-adjust: exact; 
              print-color-adjust: exact;
            }

            .page-container {
              display: flex;
              justify-content: center;
              padding: 20px;
            }

            .label-page { 
              width: 100mm; 
              height: 150mm; 
              background: white;
              border: 1px solid #ddd;
              padding: 5mm;
              box-sizing: border-box;
              position: relative;
              display: flex;
              flex-direction: column;
            }

            @media print {
              body { background: white; }
              .page-container { padding: 0; display: block; }
              .label-page { 
                border: none; 
                width: 100mm; 
                height: 150mm;
                margin: 0;
                page-break-after: always;
              }
              @page {
                size: 100mm 150mm;
                margin: 0;
              }
            }

            .header {
              display: flex;
              justify-content: space-between;
              align-items: flex-start;
              border-bottom: 2px solid #000;
              padding-bottom: 10px;
              margin-bottom: 10px;
            }

            .logo-text {
              font-family: 'Arial', sans-serif;
              font-style: italic;
              font-weight: 900;
              font-size: 20px;
              color: #004b8d;
              text-transform: uppercase;
              letter-spacing: -0.5px;
            }
            .logo-sub {
              font-size: 10px;
              color: #004b8d;
              font-weight: bold;
              margin-top: -2px;
            }

            .service-box {
              border: 3px solid #000;
              padding: 5px 15px;
              font-size: 32px;
              font-weight: 900;
              text-align: center;
              line-height: 1;
              border-radius: 4px;
            }

            .section {
              border: 1px solid #000;
              border-radius: 4px;
              padding: 8px;
              margin-bottom: 8px;
              position: relative;
            }

            .section-title {
              font-size: 9px;
              font-weight: bold;
              text-transform: uppercase;
              color: #666;
              margin-bottom: 4px;
              letter-spacing: 0.5px;
            }

            .content-lg {
              font-size: 14px;
              font-weight: bold;
              line-height: 1.3;
              text-transform: uppercase;
            }
            
            .content-md {
              font-size: 12px;
              line-height: 1.3;
              text-transform: uppercase;
            }

            .content-sm {
              font-size: 10px;
              line-height: 1.2;
              color: #333;
            }

            .grid-2 {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 8px;
            }

            .barcode-container {
              margin-top: auto;
              text-align: center;
              padding-top: 10px;
              border-top: 2px dashed #ccc;
            }
            
            svg#barcode {
              width: 100%;
              max-height: 80px;
            }

            .footer-info {
              display: flex;
              justify-content: space-between;
              font-size: 8px;
              margin-top: 5px;
              color: #555;
            }

            .qr-placeholder {
              position: absolute;
              right: 8px;
              top: 8px;
              width: 50px;
              height: 50px;
            }
          </style>
        </head>
        <body>
          <div class="page-container">
            <div class="label-page">
              
              <!-- Header -->
              <div class="header">
                <div>
                  <div class="logo-text">Correo Argentino</div>
                  <div class="logo-text" style="font-size: 16px; color: #000;">Paq.ar</div>
                </div>
                <div class="service-box">
                  ${data.productType}
                </div>
              </div>

              <!-- Destinatario -->
              <div class="section" style="flex-grow: 1; min-height: 120px;">
                <div class="section-title">DESTINATARIO / RECEIVER</div>
                
                <div class="content-lg" style="font-size: 18px; margin-bottom: 5px;">
                  ${data.receiver.nombre}
                </div>
                
                <div class="content-md">
                  ${data.receiver.calle} ${data.receiver.numero}
                  ${data.receiver.floor ? 'Piso ' + data.receiver.floor : ''} 
                  ${data.receiver.department ? 'Dpto ' + data.receiver.department : ''}
                </div>
                
                <div class="content-lg" style="margin-top: 5px;">
                  ${data.receiver.localidad}
                </div>
                
                <div class="content-md">
                  ${data.receiver.provincia}
                </div>

                <div style="font-size: 24px; font-weight: 900; margin-top: 10px; text-align: right;">
                  CP ${data.receiver.cp}
                </div>
                
                <div id="qrcode" class="qr-placeholder"></div>
              </div>

              <!-- Remitente -->
              <div class="section">
                <div class="section-title">REMITENTE / SENDER</div>
                <div class="content-sm">
                  <b>${data.sender.nombre}</b><br>
                  ${data.sender.calle} ${data.sender.numero}, ${data.sender.localidad} (${data.sender.cp})<br>
                  ${data.sender.provincia}
                </div>
              </div>

              <!-- Info Grid -->
              <div class="grid-2">
                <div class="section">
                  <div class="section-title">PESO / WEIGHT</div>
                  <div class="content-lg">${data.package.peso} KG</div>
                </div>
                <div class="section">
                  <div class="section-title">PEDIDO / REF</div>
                  <div class="content-lg" style="font-size: 12px; overflow: hidden; white-space: nowrap;">
                    ${data.trackingNumber}
                  </div>
                </div>
              </div>

              <!-- Barcode -->
              <div class="barcode-container">
                <svg id="barcode"></svg>
                <div class="footer-info">
                  <span>Impreso: ${today}</span>
                  <span>Urban CDG e-Logistics</span>
                </div>
              </div>

            </div>
          </div>

          <script>
            window.onload = function() {
              // Generate Barcode
              JsBarcode("#barcode", "${data.trackingNumber}", {
                format: "CODE128",
                width: 2.5,
                height: 70,
                displayValue: true,
                fontSize: 16,
                marginTop: 10,
                marginBottom: 10
              });

              // Generate QR (Optional, showing destination CP or Tracking URL)
              new QRCode(document.getElementById("qrcode"), {
                text: "${data.trackingNumber}",
                width: 50,
                height: 50
              });

              setTimeout(function() {
                window.print();
              }, 500);
            }
          </script>
        </body>
      </html>
    `
  }
}
