import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
} from '@react-pdf/renderer'

import { styles } from './pdf-styles'
import { STUDIO_NAME, TERMINOS_Y_CONDICIONES } from './pdf-content'
import { formatMXN, formatFecha } from '@/lib/formatters'

// Safe type — no costo_proveedor, no margen
export interface QuoteLineItem {
  descripcion: string
  referencia: string | null
  cantidad: number
  precioVenta: number
  totalVenta: number
}

export interface QuoteProjectData {
  id: string
  nombre: string
  cliente_nombre: string
  numero_cotizacion: string | null
  fecha_cotizacion: string | null
  salesperson: string | null
  subtotal: number
  iva: number
  granTotal: number
  includeIva: boolean
  anticipo: number
  saldo: number
  lineItems: QuoteLineItem[]
}

interface CotizacionTemplateProps {
  project: QuoteProjectData
}

export function CotizacionTemplate({ project }: CotizacionTemplateProps) {
  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header: COTIZACION heading left, Studio name right */}
        <View style={styles.header}>
          <Text style={styles.heading}>COTIZACION</Text>
          <Text style={styles.studioName}>{STUDIO_NAME}</Text>
        </View>

        {/* Client Info Block */}
        <View style={styles.clientBlock}>
          <View style={{ marginBottom: 8 }}>
            <Text style={styles.clientLabel}>Cliente</Text>
            <Text style={styles.clientValue}>{project.cliente_nombre}</Text>
          </View>
          <View style={{ flexDirection: 'row', gap: 24 }}>
            {project.numero_cotizacion && (
              <View style={{ marginRight: 24 }}>
                <Text style={styles.clientLabel}>No. Cotizacion</Text>
                <Text style={styles.clientValue}>{project.numero_cotizacion}</Text>
              </View>
            )}
            {project.fecha_cotizacion && (
              <View style={{ marginRight: 24 }}>
                <Text style={styles.clientLabel}>Fecha</Text>
                <Text style={styles.clientValue}>{formatFecha(project.fecha_cotizacion)}</Text>
              </View>
            )}
            {project.salesperson && (
              <View>
                <Text style={styles.clientLabel}>Vendedor</Text>
                <Text style={styles.clientValue}>{project.salesperson}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Line Items Table */}
        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.colDesc, styles.headerCell]}>Descripcion</Text>
          <Text style={[styles.colQty, styles.headerCell]}>Cant.</Text>
          <Text style={[styles.colPrice, styles.headerCell]}>Precio Unit.</Text>
          <Text style={[styles.colTotal, styles.headerCell]}>Total</Text>
        </View>

        {/* Table Rows */}
        {project.lineItems.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <View style={styles.colDesc}>
              <Text>{item.descripcion}</Text>
              {item.referencia && (
                <Text style={{ fontSize: 7.5, color: '#6b7280', marginTop: 1 }}>{item.referencia}</Text>
              )}
            </View>
            <Text style={styles.colQty}>{item.cantidad}</Text>
            <Text style={styles.colPrice}>{formatMXN(item.precioVenta)}</Text>
            <Text style={styles.colTotal}>{formatMXN(item.totalVenta)}</Text>
          </View>
        ))}

        {/* Totals Block */}
        <View style={styles.totalsSection}>
          {project.includeIva ? (
            <>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>Subtotal</Text>
                <Text style={styles.totalsValue}>{formatMXN(project.subtotal)}</Text>
              </View>
              <View style={styles.totalsRow}>
                <Text style={styles.totalsLabel}>IVA 16%</Text>
                <Text style={styles.totalsValue}>{formatMXN(project.iva)}</Text>
              </View>
            </>
          ) : (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Subtotal</Text>
              <Text style={styles.totalsValue}>{formatMXN(project.subtotal)}</Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>TOTAL</Text>
            <Text style={styles.grandTotalValue}>{formatMXN(project.granTotal)}</Text>
          </View>
        </View>

        {/* Payment Schedule */}
        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Plan de Pagos</Text>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Anticipo (70%)</Text>
            <Text style={styles.paymentValue}>{formatMXN(project.anticipo)}</Text>
          </View>
          <View style={styles.paymentRow}>
            <Text style={styles.paymentLabel}>Saldo (30%)</Text>
            <Text style={styles.paymentValue}>{formatMXN(project.saldo)}</Text>
          </View>
        </View>

        {/* Terms and Conditions */}
        <View style={styles.termsSection}>
          <Text style={styles.sectionTitle}>Terminos y Condiciones</Text>
          <Text style={styles.termsText}>{TERMINOS_Y_CONDICIONES}</Text>
        </View>
      </Page>
    </Document>
  )
}
