import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@client/src/components/ui/button';
import { Progress } from '@client/src/components/ui/progress';
import { useTranslation } from '@client/src/stores/i18nStore';

interface UploadDropzoneProps {
  onParse: (file: File) => Promise<void>;
  isParsing: boolean;
  parseProgress: number;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

const UploadDropzone = ({ onParse, isParsing, parseProgress }: UploadDropzoneProps) => {
  const { t } = useTranslation();
  const [file, setFile] = useState<File | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setFile(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'text/csv': ['.csv'],
    },
    maxFiles: 1,
    multiple: false,
    disabled: isParsing,
  });

  const handleStart = async () => {
    if (!file) return;
    await onParse(file);
  };

  const handleReset = () => {
    setFile(null);
  };

  return (
    <div className="w-full">
      {!file && (
        <div
          {...getRootProps()}
          className={`
            border-2 border-dashed rounded-sm p-10 flex flex-col items-center justify-center
            transition-colors cursor-pointer min-h-[200px]
            ${isDragActive ? 'border-primary bg-accent' : 'border-border hover:border-primary/60 hover:bg-accent/30'}
            ${isParsing ? 'pointer-events-none opacity-60' : ''}
          `}
        >
          <input {...getInputProps()} />
          <Upload className="w-10 h-10 text-primary mb-3" strokeWidth={1.5} />
          <p className="text-sm font-medium text-foreground">{t('purchase.upload')}</p>
          <p className="text-xs text-muted-foreground mt-1">{t('purchase.uploadHint')}</p>
        </div>
      )}

      {file && !isParsing && (
        <div className="border rounded-sm p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-sm bg-accent flex items-center justify-center">
              <FileText className="w-5 h-5 text-primary" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{file.name}</p>
              <p className="text-xs text-muted-foreground font-mono">
                {formatFileSize(file.size)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RefreshCw className="w-3.5 h-3.5" strokeWidth={1.5} />
              {t('purchase.reUpload')}
            </Button>
            <Button variant="default" size="sm" onClick={handleStart}>
              {t('purchase.startParse')}
            </Button>
          </div>
        </div>
      )}

      {isParsing && file && (
        <div className="border rounded-sm p-6">
          <div className="flex items-center gap-3 mb-4">
            <Loader2 className="w-5 h-5 text-primary animate-spin" strokeWidth={1.5} />
            <p className="text-sm font-medium text-foreground">{t('purchase.uploading')}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Progress value={parseProgress} />
            </div>
            <span className="text-xs font-mono text-muted-foreground w-12 text-right">
              {parseProgress}%
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-3 font-mono">{file.name}</p>
        </div>
      )}
    </div>
  );
};

export default UploadDropzone;
