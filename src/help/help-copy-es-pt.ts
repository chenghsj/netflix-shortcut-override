import type { HelpTopicText } from './help-copy'

export const ES_HELP_TOPICS: HelpTopicText = {
  start: [
    'Empezar a ver Netflix',
    '1. Abre un video de Netflix.\n2. Selecciona Activar extensión en el menú de la barra de herramientas o en la configuración.\n3. Haz clic en el video y usa tus atajos.\n\nLos atajos funcionan en las páginas de reproducción de Netflix y se suspenden mientras escribes en un campo de texto.',
  ],
  edit: [
    'Asignar, borrar, guardar y cancelar atajos',
    '1. Selecciona el lápiz en la fila de un atajo.\n2. Haz clic en el campo y pulsa la combinación completa.\n3. Selecciona Guardar para aplicar los cambios.\n\n- Borrar atajo (×): borra y guarda para dejar la tecla sin asignar.\n- Guardar: aplica el atajo y los valores que editaste con él.\n- Cancelar: descarta los cambios pendientes.\n- Deshacer cambios: recupera los valores con los que se abrió el editor. Guarda para aplicarlos.\n\nLa mayoría de las opciones que están fuera de las ventanas de edición se guardan automáticamente.',
  ],
  supportedKeys: [
    'Teclas reservadas al configurar atajos',
    'Puedes asignar teclas comunes, multimedia, de volumen y del navegador cuando el navegador detecte esas pulsaciones.',
  ],
  conflicts: [
    'Resolver conflictos de atajos',
    '- Los atajos activos tienen reservadas sus teclas entre las funciones generales y las de subtítulos, incluso cuando el interruptor principal está desactivado.\n- Al desactivar un atajo individual se libera su tecla.\n- Si hay un conflicto, selecciona Cambiar tecla o confirma el traspaso para desactivar el atajo que la usa.\n- Pulsa Esc, haz clic fuera de la ventana o cancela para descartar los cambios pendientes.\n- Los atajos generales tienen prioridad sobre los de subtítulos si usan la misma tecla.\n- Al reasignar una acción activa de Netflix se bloquea su tecla original. Borrar o desactivar el atajo libera la tecla original.',
  ],
  visibility: [
    'Mostrar, ocultar y contraer funciones',
    '1. Abre Administrar funciones de la página en la parte superior de una sección de atajos.\n2. Desmarca funciones o grupos para ver cómo se ocultan y desactivan.\n3. Selecciona Aplicar para guardar. Selecciona Cancelar o cierra el menú para descartar la vista previa.\n\nLas funciones ocultas conservan sus teclas y parámetros, y desaparecen de la búsqueda en la configuración y el menú de la barra de herramientas. Vuelve a marcarlas para mostrarlas. Los atajos en conflicto siguen desactivados.\n\nContraer una tabla solo cambia su presentación. Esta guía incluye las funciones ocultas.',
  ],
  reset: [
    'Restablecer ajustes y eliminar elementos personalizados',
    'Antes de restablecer, revisa en la confirmación los ajustes afectados. Al eliminar un elemento personalizado también se elimina su configuración. Exporta una copia de seguridad si quieres poder recuperarla.',
  ],
  backup: [
    'Exportar e importar la configuración',
    'Para exportar, abre Copia de seguridad y restauración y descarga un archivo JSON con tu configuración.\n\nPara importar:\n\n1. Selecciona un archivo de copia de seguridad.\n2. Revisa el resumen.\n3. Confirma el reemplazo de la configuración actual.\n\nLa importación sobrescribe la configuración actual. Si quieres conservarla, expórtala primero.\n\n- Los formatos anteriores compatibles se actualizan al importar.\n- Se rechazan las copias no válidas o de una versión más reciente incompatible.\n- Si cancelas, se conserva la configuración actual.',
  ],
  sync: [
    'Sincronización y errores al guardar',
    'La configuración utiliza el almacenamiento sincronizado del navegador cuando está disponible. La sincronización entre dispositivos depende del navegador y de tu cuenta.\n\n- Chrome y Edge usan cuentas de sincronización distintas de Firefox. Exporta e importa la configuración para transferirla.\n- Si aparece un error al guardar, vuelve a hacer el cambio y comprueba que se guardó antes de cerrar.\n- Si un cambio no se guarda, se puede recuperar la última configuración confirmada.',
  ],
  diagnostics: [
    'Qué hacer si no funcionan los atajos',
    '1. Revisa el interruptor general, el de cada atajo, las teclas asignadas y que las funciones estén visibles. Para saltar entre subtítulos, activa también la navegación por subtítulos.\n2. Sal de los campos de texto y haz clic en el video de Netflix.\n3. Abre el menú de la barra de herramientas para revisar el estado de la conexión. Recarga Netflix si se solicita después de actualizar.\n\nPara informar de un problema, selecciona Copiar diagnóstico e incluye los datos de reproducción locales.\n\nPara usar la imagen en imagen de esta extensión, abre Netflix en un navegador Chromium compatible.',
  ],
  permissions: [
    'Acceso a sitios y errores de subtítulos',
    'Permite que la extensión se ejecute en Netflix.\n\n- La navegación por subtítulos también puede solicitar acceso a los servidores de subtítulos de Netflix (nflxvideo.net).\n- Si se denegó o revocó el acceso, desactiva y vuelve a activar la navegación por subtítulos para solicitarlo. También puedes recuperarlo desde los permisos de la extensión en el navegador.\n- El acceso concedido se conserva al desactivar la función.\n- Si aún no se cargan los subtítulos, elige otra pista o recarga Netflix.',
  ],
  privacy: [
    'Privacidad y uso de datos',
    '- Los subtítulos se descargan de los servidores de Netflix, se procesan de forma local y se guardan temporalmente en memoria durante la reproducción.\n- Los subtítulos se procesan en el dispositivo, sin servicios de análisis ni procesamiento de terceros.\n- La configuración usa el almacenamiento del navegador.\n- El diagnóstico de compatibilidad se queda en el dispositivo y se copia cuando seleccionas Copiar diagnóstico.\n- La extensión funciona sin seguimiento ni servicios de análisis remotos.',
  ],
}

export const PT_BR_HELP_TOPICS: HelpTopicText = {
  start: [
    'Começar a assistir',
    '1. Abra um vídeo da Netflix.\n2. Selecione Ativar extensão no menu da barra de ferramentas ou nas configurações.\n3. Clique no vídeo e use seus atalhos.\n\nOs atalhos funcionam nas páginas de reprodução da Netflix e ficam suspensos enquanto você digita em um campo de texto.',
  ],
  edit: [
    'Definir, limpar, salvar e cancelar atalhos',
    '1. Selecione o lápis na linha do atalho.\n2. Clique no campo e pressione a combinação completa.\n3. Selecione Salvar para aplicar as alterações.\n\n- Limpar atalho (×): limpe e salve para deixar a ação sem atalho.\n- Salvar: aplica o atalho e os valores editados com ele.\n- Cancelar: descarta as alterações pendentes.\n- Desfazer alterações: recupera os valores de quando o editor foi aberto. Salve para aplicar.\n\nA maioria das opções fora das janelas de edição é salva automaticamente.',
  ],
  supportedKeys: [
    'Teclas reservadas na configuração de atalhos',
    'Você pode atribuir teclas comuns, de mídia, de volume e do navegador quando o navegador detectar essas teclas.',
  ],
  conflicts: [
    'Resolver conflitos de atalhos',
    '- Atalhos ativos reservam suas teclas entre as ações gerais e as de legendas, mesmo com o controle principal desativado.\n- Desativar um atalho individual libera sua tecla.\n- Em caso de conflito, selecione Mudar tecla ou confirme a reatribuição para desativar o atalho que usa essa tecla.\n- Pressione Esc, clique fora da janela ou cancele para descartar as alterações pendentes.\n- Quando há uma tecla em comum, os atalhos gerais têm prioridade sobre os de legendas.\n- Redefinir a tecla de uma ação ativa da Netflix bloqueia a tecla original. Limpar ou desativar o atalho libera a tecla original.',
  ],
  visibility: [
    'Mostrar, ocultar e recolher recursos',
    '1. Abra Gerenciar recursos da página no início de uma seção de atalhos.\n2. Desmarque os recursos ou grupos para visualizar como serão ocultados e desativados.\n3. Selecione Aplicar para salvar. Selecione Cancelar ou feche o menu para descartar a prévia.\n\nOs recursos ocultos mantêm suas teclas e parâmetros e somem da busca nas configurações e no menu da barra de ferramentas. Marque-os novamente para exibi-los. Os atalhos em conflito continuam desativados.\n\nRecolher uma tabela só muda sua exibição. Este guia inclui os recursos ocultos.',
  ],
  reset: [
    'Redefinir configurações e excluir itens personalizados',
    'Antes de redefinir, confira na confirmação quais configurações serão afetadas. Excluir um item personalizado também remove suas configurações. Exporte um backup se quiser recuperá-las depois.',
  ],
  backup: [
    'Exportar e importar configurações',
    'Para exportar, abra Backup e restauração e baixe um arquivo JSON com suas configurações.\n\nPara importar:\n\n1. Selecione um arquivo de backup.\n2. Confira o resumo.\n3. Confirme a substituição das configurações atuais.\n\nA importação substitui as configurações atuais. Para guardá-las, exporte um backup antes.\n\n- Formatos anteriores compatíveis são atualizados na importação.\n- Backups inválidos ou de versões mais recentes incompatíveis são rejeitados.\n- Se você cancelar, as configurações atuais serão preservadas.',
  ],
  sync: [
    'Sincronização e erros ao salvar',
    'As configurações usam o armazenamento sincronizado do navegador quando disponível. A sincronização entre dispositivos depende do navegador e da sua conta.\n\n- Chrome e Edge usam contas de sincronização diferentes do Firefox. Exporte e importe as configurações para transferi-las.\n- Se ocorrer um erro ao salvar, tente fazer a alteração de novo e confira se foi salva antes de fechar.\n- Alterações que não forem salvas podem ser revertidas para as últimas configurações confirmadas.',
  ],
  diagnostics: [
    'O que fazer se os atalhos não funcionarem',
    '1. Confira o controle geral, o controle de cada atalho, as teclas atribuídas e se os recursos estão visíveis. Para saltar entre legendas, ative também a navegação por legendas.\n2. Saia dos campos de texto e clique no vídeo da Netflix.\n3. Abra o menu da barra de ferramentas para conferir a conexão. Recarregue a Netflix se solicitado após uma atualização.\n\nPara relatar um problema, selecione Copiar diagnóstico e inclua os dados locais de reprodução.\n\nPara usar o Picture-in-Picture desta extensão, abra a Netflix em um navegador Chromium compatível.',
  ],
  permissions: [
    'Acesso a sites e erros de legendas',
    'Permita que a extensão funcione na Netflix.\n\n- A navegação por legendas também pode solicitar acesso aos servidores de legendas da Netflix (nflxvideo.net).\n- Se o acesso tiver sido negado ou revogado, desative e reative a navegação por legendas para solicitá-lo novamente. Você também pode restaurá-lo nas permissões da extensão no navegador.\n- Desativar o recurso preserva o acesso concedido.\n- Se as legendas ainda não carregarem, selecione outra faixa ou recarregue a Netflix.',
  ],
  privacy: [
    'Privacidade e uso de dados',
    '- As legendas são baixadas dos servidores da Netflix, processadas localmente e mantidas temporariamente na memória durante a reprodução.\n- O processamento ocorre no dispositivo, sem serviços de análise ou processamento de terceiros.\n- As configurações usam o armazenamento do navegador.\n- O diagnóstico de compatibilidade fica no dispositivo e só é copiado quando você seleciona Copiar diagnóstico.\n- A extensão funciona sem rastreamento nem serviços de análise remotos.',
  ],
}
