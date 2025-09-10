import { ISendMailOptions, MailerService } from '@nestjs-modules/mailer';
import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(private readonly mailerService: MailerService) {}

  async sendEmail(params: {
    subject: string;
    template: string;
    context: ISendMailOptions['context'];
    to: string;
  }) {
    try {
      const emailsList: string[] | undefined = process.env.SMTP_TO?.split(',');

      if (!emailsList) {
        throw new Error(
          `No recipients found in SMTP_TO env var, please check your .env file`,
        );
      }
      const sendMailParams = {
        to: params.to,
        from: process.env.SMTP_FROM,
        subject: params.subject,
        template: params.template,
        context: params.context,
      };
      // add a safety timeout to avoid long hangs
      const response = await Promise.race([
        this.mailerService.sendMail(sendMailParams),
        new Promise((_, reject) => setTimeout(() => reject(new Error('SMTP timeout')), 10000))
      ]);
      this.logger.log(
        `Email sent successfully to recipients with the following parameters : ${JSON.stringify(
          sendMailParams,
        )}`,
        response,
      );
    } catch (error) {
      this.logger.error(
        `Error while sending mail with the following parameters : ${JSON.stringify(
          params,
        )}`,
        error,
      );
    }
  }
}