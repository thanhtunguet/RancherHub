{{/*
Expand the name of the chart.
*/}}
{{- define "rancher-hub.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "rancher-hub.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "rancher-hub.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "rancher-hub.labels" -}}
helm.sh/chart: {{ include "rancher-hub.chart" . }}
{{ include "rancher-hub.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "rancher-hub.selectorLabels" -}}
app.kubernetes.io/name: {{ include "rancher-hub.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "rancher-hub.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "rancher-hub.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}

{{/*
Backend labels
*/}}
{{- define "rancher-hub.backend.labels" -}}
{{ include "rancher-hub.labels" . }}
app.kubernetes.io/component: backend
{{- end }}

{{/*
Backend selector labels
*/}}
{{- define "rancher-hub.backend.selectorLabels" -}}
{{ include "rancher-hub.selectorLabels" . }}
app.kubernetes.io/component: backend
{{- end }}

{{/*
Frontend labels
*/}}
{{- define "rancher-hub.frontend.labels" -}}
{{ include "rancher-hub.labels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{/*
Frontend selector labels
*/}}
{{- define "rancher-hub.frontend.selectorLabels" -}}
{{ include "rancher-hub.selectorLabels" . }}
app.kubernetes.io/component: frontend
{{- end }}

{{/*
PostgreSQL labels
*/}}
{{- define "rancher-hub.postgresql.labels" -}}
{{ include "rancher-hub.labels" . }}
app.kubernetes.io/component: database
{{- end }}

{{/*
PostgreSQL selector labels
*/}}
{{- define "rancher-hub.postgresql.selectorLabels" -}}
{{ include "rancher-hub.selectorLabels" . }}
app.kubernetes.io/component: database
{{- end }}

{{/*
PostgreSQL fullname
*/}}
{{- define "rancher-hub.postgresql.fullname" -}}
{{- printf "%s-postgresql" (include "rancher-hub.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Backend fullname
*/}}
{{- define "rancher-hub.backend.fullname" -}}
{{- printf "%s-backend" (include "rancher-hub.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Frontend fullname
*/}}
{{- define "rancher-hub.frontend.fullname" -}}
{{- printf "%s-frontend" (include "rancher-hub.fullname" .) | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Get the PostgreSQL host
*/}}
{{- define "rancher-hub.postgresql.host" -}}
{{- if .Values.postgresql.enabled }}
{{- include "rancher-hub.postgresql.fullname" . }}
{{- else }}
{{- .Values.backend.env.database.host }}
{{- end }}
{{- end }}

{{/*
Get the PostgreSQL port
*/}}
{{- define "rancher-hub.postgresql.port" -}}
{{- if .Values.postgresql.enabled }}
{{- .Values.postgresql.service.port }}
{{- else }}
{{- .Values.backend.env.database.port }}
{{- end }}
{{- end }}

{{/*
Get the PostgreSQL database name
*/}}
{{- define "rancher-hub.postgresql.database" -}}
{{- if .Values.postgresql.enabled }}
{{- .Values.postgresql.auth.database }}
{{- else }}
{{- .Values.backend.env.database.name }}
{{- end }}
{{- end }}

{{/*
Get the PostgreSQL username
*/}}
{{- define "rancher-hub.postgresql.username" -}}
{{- if .Values.postgresql.enabled }}
{{- .Values.postgresql.auth.username }}
{{- else }}
{{- .Values.backend.env.database.username }}
{{- end }}
{{- end }}

{{/*
Get the secret name for PostgreSQL password
*/}}
{{- define "rancher-hub.postgresql.secretName" -}}
{{- if .Values.postgresql.auth.existingSecret }}
{{- .Values.postgresql.auth.existingSecret }}
{{- else }}
{{- include "rancher-hub.postgresql.fullname" . }}
{{- end }}
{{- end }}

{{/*
Get the secret name for backend
*/}}
{{- define "rancher-hub.backend.secretName" -}}
{{- if .Values.backend.secrets.existingSecret }}
{{- .Values.backend.secrets.existingSecret }}
{{- else }}
{{- include "rancher-hub.backend.fullname" . }}
{{- end }}
{{- end }}
