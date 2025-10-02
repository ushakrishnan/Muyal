export class ResponseFormatter {
  static formatCodeBlock(code: string, language?: string): string {
    return `\`\`\`${language || ''}\n${code}\n\`\`\``;
  }

  static formatList(items: string[]): string {
    return items.map((item, index) => `${index + 1}. ${item}`).join('\n');
  }

  static formatTable(headers: string[], rows: string[][]): string {
    const headerRow = '| ' + headers.join(' | ') + ' |';
    const separatorRow = '| ' + headers.map(() => '---').join(' | ') + ' |';
    const dataRows = rows.map(row => '| ' + row.join(' | ') + ' |');
    
    return [headerRow, separatorRow, ...dataRows].join('\n');
  }

  static truncateResponse(text: string, maxLength: number = 4000): string {
    if (text.length <= maxLength) return text;
    
    return text.substring(0, maxLength - 3) + '...';
  }

  static addEmojis(text: string): string {
    // Add contextual emojis based on content
    if (text.includes('error') || text.includes('failed')) {
      return '❌ ' + text;
    }
    if (text.includes('success') || text.includes('completed')) {
      return '✅ ' + text;
    }
    if (text.includes('warning') || text.includes('caution')) {
      return '⚠️ ' + text;
    }
    if (text.includes('tip') || text.includes('suggestion')) {
      return '💡 ' + text;
    }
    
    return text;
  }

  static formatForPlatform(text: string, platform: string): string {
    switch (platform) {
      case 'microsoft365':
        return this.formatForTeams(text);
      case 'web':
        return this.formatForWeb(text);
      case 'slack':
        return this.formatForSlack(text);
      default:
        return text;
    }
  }

  private static formatForTeams(text: string): string {
    // Teams-specific formatting
    return text.replace(/\*\*(.*?)\*\*/g, '**$1**'); // Bold
  }

  private static formatForWeb(text: string): string {
    // Web-specific formatting (HTML safe)
    return text.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  private static formatForSlack(text: string): string {
    // Slack-specific formatting
    return text.replace(/\*\*(.*?)\*\*/g, '*$1*'); // Bold in Slack
  }
}