# Solicitud de acceso a Azure DevOps

**Asunto:** Solicitud de acceso Basic y proyecto Azure DevOps — Benchmark ERSE

Hola,

Formo parte del equipo de **Estrategia**, no del equipo de IT. Estoy impulsando desde negocio un benchmark interno de ofertas comerciales de electricidad y gas y necesito orientación para alojarlo y operarlo correctamente dentro de la infraestructura corporativa.

El proyecto utiliza los datos públicos del simulador de precios de ERSE para comparar el posicionamiento de Repsol con el de otros comercializadores.

Actualmente consiste en varios scripts de Python que:

- comprueban diariamente si ERSE ha publicado nuevos datos;
- descargan y validan los CSV oficiales;
- mantienen un histórico de publicaciones;
- generan un informe HTML autónomo con el ranking y las comparaciones;
- ejecutan pruebas automáticas;
- envían una notificación por correo cuando se detectan cambios.

En este momento el código y la automatización se ejecutan mediante GitHub Actions en un repositorio privado externo. El objetivo es trasladar el repositorio, la ejecución programada, el histórico, las credenciales y el envío de correo a infraestructura corporativa de Repsol. El proceso debe funcionar aunque el ordenador de la usuaria esté apagado.

He encontrado la organización Azure DevOps `repsol-digital-team`, pero actualmente solo tengo acceso **Stakeholder**, que no permite utilizar Azure Repos en proyectos privados.

Necesitaría:

- acceso **Basic** y perfil **Contributor**;
- un nuevo proyecto privado, idealmente `Benchmark ERSE`, o la indicación de un proyecto existente autorizado;
- acceso a **Azure Repos**;
- permisos para crear y ejecutar **pipelines YAML**;
- acceso a un **agent pool**.

El pipeline necesitará acceso HTTPS saliente a `simuladorprecos.erse.pt`. En una segunda fase también será necesario definir un buzón corporativo y el mecanismo autorizado para el envío automático de correo, preferiblemente Microsoft Graph.

¿Podrían confirmar si Azure DevOps es la plataforma adecuada, ayudarme a obtener estos accesos o indicarme el equipo responsable?

Gracias.
