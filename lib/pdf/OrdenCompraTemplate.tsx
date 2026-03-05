import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
} from '@react-pdf/renderer'

import { styles } from './pdf-styles'
import { STUDIO_NAME } from './pdf-content'
import { formatMXN } from '@/lib/formatters'

export interface OcLineItem {
  descripcion: string
  referencia: string | null
  dimensiones: string | null
  cantidad: number
  costoProveedor: number
  totalCosto: number
}

export interface OcSupplierInfo {
  nombre: string
  contacto: string | null
  email: string | null
  telefono: string | null
}

export interface OcProjectData {
  projectId: string
  projectNombre: string
  supplier: OcSupplierInfo
  fecha: string
  lineItems: OcLineItem[]
  granTotalCosto: number
}

interface OrdenCompraTemplateProps {
  data: OcProjectData
}

export function OrdenCompraTemplate({ data }: OrdenCompraTemplateProps) {
  const { supplier, lineItems, projectNombre, fecha, granTotalCosto } = data

  return (
    <Document>
      <Page size="LETTER" style={styles.page}>
        {/* Header: ORDEN DE COMPRA heading left + date, Studio name right */}
        <View style={styles.header}>
          <View>
            <Text style={styles.heading}>ORDEN DE COMPRA</Text>
            <Text style={{ fontSize: 9, color: '#6b7280' }}>{fecha}</Text>
          </View>
          <Text style={styles.studioName}>{STUDIO_NAME}</Text>
        </View>

        {/* Supplier Block */}
        <View style={styles.clientBlock}>
          <View style={{ marginBottom: 6 }}>
            <Text style={styles.clientLabel}>PROVEEDOR</Text>
            <Text style={styles.clientValue}>{supplier.nombre}</Text>
          </View>
          {supplier.contacto && (
            <View style={{ marginBottom: 4 }}>
              <Text style={styles.clientLabel}>CONTACTO</Text>
              <Text style={styles.clientValue}>{supplier.contacto}</Text>
            </View>
          )}
          {supplier.email && (
            <View style={{ marginBottom: 4 }}>
              <Text style={styles.clientLabel}>EMAIL</Text>
              <Text style={styles.clientValue}>{supplier.email}</Text>
            </View>
          )}
          {supplier.telefono && (
            <View style={{ marginBottom: 4 }}>
              <Text style={styles.clientLabel}>TELEFONO</Text>
              <Text style={styles.clientValue}>{supplier.telefono}</Text>
            </View>
          )}
        </View>

        {/* Project Reference */}
        <View style={{ marginBottom: 16 }}>
          <Text style={styles.clientLabel}>PROYECTO</Text>
          <Text style={styles.clientValue}>{projectNombre}</Text>
        </View>

        {/* Line Items Table */}
        {/* Table Header */}
        <View style={styles.tableHeader}>
          <Text style={[styles.colDesc, styles.headerCell]}>DESCRIPCION</Text>
          <Text style={[styles.colQty, styles.headerCell]}>CANT.</Text>
          <Text style={[styles.colPrice, styles.headerCell]}>COSTO UNIT.</Text>
          <Text style={[styles.colTotal, styles.headerCell]}>TOTAL</Text>
        </View>

        {/* Table Rows */}
        {lineItems.map((item, index) => (
          <View key={index} style={styles.tableRow}>
            <View style={styles.colDesc}>
              <Text>{item.descripcion}</Text>
              {item.referencia && (
                <Text style={{ fontSize: 7.5, color: '#6b7280', marginTop: 1 }}>{item.referencia}</Text>
              )}
              {item.dimensiones && (
                <Text style={{ fontSize: 7.5, color: '#6b7280', marginTop: 1 }}>{item.dimensiones}</Text>
              )}
            </View>
            <Text style={styles.colQty}>{item.cantidad}</Text>
            <Text style={styles.colPrice}>{formatMXN(item.costoProveedor)}</Text>
            <Text style={styles.colTotal}>{formatMXN(item.totalCosto)}</Text>
          </View>
        ))}

        {/* Grand Total Cost Row */}
        <View style={styles.totalsSection}>
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>TOTAL COSTO</Text>
            <Text style={styles.grandTotalValue}>{formatMXN(granTotalCosto)}</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
