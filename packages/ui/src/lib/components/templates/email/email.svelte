<script lang="ts">
	/**
	 * @tags email, signature
	 * @layout horizontal
	 */
	import { Component, type ComponentProps } from '@layerd/ui';

	export interface EmailSignatureData {
		id: string;
		type: string;
		name: string;
		title: string;
		phone: string;
		email: string; // Primary email
		group: string; // Secondary email (company/group email)
		href: string; // LinkedIn URL
		src: string; // Headshot image URL
		slug: string;
		logoImage?: string;
		socialLinks?: {
			linkedin?: string;
			facebook?: string;
			whatsapp?: string;
		};
		banner?: {
			href: string;
			src: string;
			alt: string;
		};
	}

	export interface EmailProps extends ComponentProps {
		data: EmailSignatureData;
		/** Callback to expose the getHTML method */
		onMount?: (instance: { getHTML: () => string }) => void;
	}

	let { data, onMount, children = undefined, ...props }: EmailProps = $props();

	// Shared template data - single source of truth
	const template = $derived({
		linkedinUrl: data.href,
		profileImage: data.src,
		name: data.name,
		title: data.title,
		phone: data.phone,
		phoneDisplay: data.phone, // Use phone as-is for display
		email: data.email,
		groupEmails: (data.group || '')
			.split(',')
			.map((e) => e.trim())
			.filter((e) => e.length > 0), // Split all group emails and filter empty
		logoImage: data.logoImage || 'https://tridentcubed.com/branding/logo-dark-horizontal.png',
		emailFooterLogo: 'https://tridentcubed.com/emails/email-footer-logo.png',
		emailFooterLinkedin: 'https://tridentcubed.com/emails/email-footer-linkedin.png',
		emailFooterFacebook: 'https://tridentcubed.com/emails/email-footer-facebook.png',
		emailFooterWhatsapp: 'https://tridentcubed.com/emails/email-footer-whatsapp.png',
		socialLinks: {
			linkedin:
				data.socialLinks?.linkedin || 'https://www.linkedin.com/company/trident-cubed-solutions',
			facebook: data.socialLinks?.facebook || 'https://www.facebook.com/TridentCubed',
			whatsapp: data.socialLinks?.whatsapp || 'https://wa.me/15705751179'
		},
		banner: data.banner
			? {
					href: data.banner.href,
					src: data.banner.src,
					alt: data.banner.alt
				}
			: undefined
	});

	// Generate clean HTML string for email clients
	function getHTML(): string {
		const t = template;
		return `
<div class="email-signature" style="box-sizing:border-box; font-family: Arial, sans-serif; font-size:14px; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; width:100%; margin:0; padding:0;">
	
	<!-- BODY -->
	<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="mso-table-lspace:0; mso-table-rspace:0;">
		<tbody>
			<tr>
				<td colspan="2" style="padding-top:40px; padding-bottom:40px; color: #111111">Best Regards,</td>
			</tr>

			<tr>

				<!-- PHOTO -->
				<td style="vertical-align:top; padding-right:10px;">
					<a href="${t.linkedinUrl}" target="_blank" rel="noopener" style="text-decoration:none; width:112px; height:132px; display:block;">
						<img src="${t.profileImage}" alt="${t.name}" width="112" style="width:112px; display:block; border:0; outline:none; text-align:center; margin:0 auto;" />
					</a>
				</td>

				<!-- CONTACT -->
				<td style="vertical-align:top; text-decoration:none !important; padding-top:10px; padding-right:10px;">
					
					<!-- NAME -->
					<strong style="font-size:24px; color:#111111; font-weight:600; line-height:28px; display:block;">${t.name}</strong>
					<span style="color:#00458B; font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:.2px;">${t.title}</span>
					
					<!-- INFO -->
					<div style="padding-top:10px;">
						<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="font-size:14px; line-height:18px;">
							<tbody>
								<!-- phone -->
								<tr>
									<td height="16" style="vertical-align:middle; padding-right:6px;">
										<a href="tel:${t.phone}" style="text-decoration:none;">
											<img src="https://tridentcubed.com/emails/icon-phone.png" alt="Phone" width="16" height="16" style="display:block; border:0; outline:none; width:16px; height:16px;" />
										</a>
									</td>
									<td style="vertical-align:middle;">
										<a href="tel:${t.phone}" style="font-size:12px; color:#6C737E !important; text-decoration:none !important;">${t.phoneDisplay}</a>
									</td>
								</tr>
								<!-- email -->
								<tr>
									<td style="vertical-align:middle; padding-right:6px;">
										<a href="mailto:${t.email}" style="text-decoration:none;">
											<img src="https://tridentcubed.com/emails/icon-email.png" alt="Email" width="16" height="16" style="display:block; border:0; outline:none; width:16px; height:16px;" />
										</a>
									</td>
									<td style="vertical-align:middle;">
										<a href="mailto:${t.email}" style="font-size:12px; color:#6C737E !important; text-decoration:none !important;">${t.email}</a>
									</td>
								</tr>
								<!-- group emails -->
								${t.groupEmails
									.map(
										(groupEmail) => `<tr>
									<td style="vertical-align:middle; padding-right:6px;">
										<a href="mailto:${groupEmail}" style="text-decoration:none;">
											<img src="https://tridentcubed.com/emails/icon-globe.png" alt="Company Email" width="16" height="16" style="display:block; border:0; outline:none; width:16px; height:16px;" />
										</a>
									</td>
									<td style="vertical-align:middle;">
										<a href="mailto:${groupEmail}" style="font-size:12px; color:#6C737E !important; text-decoration:none !important;">${groupEmail}</a>
									</td>
								</tr>`
									)
									.join('')}
							</tbody>
						</table>
					</div>
				</td>
			</tr>
			<!-- SPACER -->
			<tr>
				<td colspan="3" style="height:20px; font-size:1px; line-height:0;">&nbsp;</td>
			</tr>
		</tbody>
	</table>


	<!-- #1 FOOTER
	::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::: -->
	<div style="border-radius:20px; height:48px; background:#000000 !important;">
		<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="height:48px; background:transparent !important;">
			<tbody style="background:transparent !important;">
				<tr>
					<td width="10">&nbsp;</td>

					<!-- LOGO (left) -->
					<td align="left" valign="middle" style="vertical-align:middle;">
						<a href="https://tridentcubed.com" target="_blank" rel="noopener" style="text-decoration:none;">
							<img src="${t.logoImage}" alt="Trident Cubed" height="32" style="display:block; border:0; outline:none; height:32px;" />
						</a>
					</td>

					<!-- SOCIAL (right) -->
					<td align="right" valign="middle" style="vertical-align:middle;">
						<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="display:inline-block; background:transparent !important;">
							<tbody style="background:transparent !important;">
								<tr>
									<td style="width:20px;">
										<a style="text-decoration:none; display:block;" href="${t.socialLinks.linkedin}" target="_blank" rel="noopener">
											<img width="20" height="20" style="border:0; outline:none; display:block;" src="https://tridentcubed.com/emails/icon-linkedin.png" alt="LinkedIn" />
										</a>
									</td>
									<td style="width:6px;">&nbsp;</td>
									<td style="width:20px;">
										<a style="text-decoration:none; display:block;" href="${t.socialLinks.facebook}" target="_blank" rel="noopener">
											<img width="20" height="20" style="border:0; outline:none; display:block;" src="https://tridentcubed.com/emails/icon-facebook.png" alt="Facebook" />
										</a>
									</td>
									<td style="width:6px;">&nbsp;</td>
									<td style="width:20px;">
										<a style="text-decoration:none; display:block;" href="${t.socialLinks.whatsapp}" target="_blank" rel="noopener">
											<img width="20" height="20" style="border:0; outline:none; display:block;" src="https://tridentcubed.com/emails/icon-whatsapp.png" alt="WhatsApp" />
										</a>
									</td>
								</tr>
							</tbody>
						</table>
					</td>

					<td width="16">&nbsp;</td>
				</tr>
			</tbody>
		</table>
	</div>

	<!-- BANNER IMAGE -->
	${
		t.banner
			? `
	<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="mso-table-lspace:0; mso-table-rspace:0; margin:20px auto;">
		<tr>
			<td style="padding:0; line-height:0; font-size:0;">
				<a href="${t.banner.href}" target="_blank" rel="noopener" style="text-decoration:none; display:block; line-height:0;">
					<img src="${t.banner.src}" alt="${t.banner.alt}" style="display:block; border:0; outline:none; width:100%; max-width:100%; height:auto;" />
				</a>
			</td>
		</tr>
	</table>`
			: ''
	}

	
	<!-- Links -->
	<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="padding-top:10px; border-radius: 20px 20px 0 0; height:100px;">
		<tbody style="background:transparent !important;">
			<tr>
				<td width="10">&nbsp;</td>

				<!-- LOGO (left) -->
				<td align="center" valign="middle" style="vertical-align:middle;">
					<a href="https://tridentcubed.com/terms" target="_blank" rel="noopener" style="text-decoration:none; color:#a4afc0; font-size:9px;">Terms of Service</a>
					<span style="color:#a4afc0; font-size:9px;"> | </span>
					<a href="https://tridentcubed.com/privacy" target="_blank" rel="noopener" style="text-decoration:none; color:#a4afc0; font-size:9px;">Privacy Policy</a>
				</td>

				<td width="16">&nbsp;</td>
			</tr>
			<tr>
				<td width="10">&nbsp;</td>

				<!-- BBB -->
				<td align="center" valign="top" style="vertical-align:top;">
					<a style="text-decoration:none; display:block;" href="https://www.bbb.org/us/tx/houston/profile/transportation/trident-cubed-solutions-llc-0915-90069161" target="_blank" rel="noopener">
						<img width="20" style="border:0; outline:none; display:block; opacity: 0.65" src="https://tridentcubed.com/emails/bbb-logo.png" alt="Better Business Bureau" />
					</a>
				</td>

				<td width="16">&nbsp;</td>
			</tr>
		</tbody>
	</table>






</div>`;
	}

	// Expose the getHTML method via onMount callback
	$effect(() => {
		if (onMount) {
			onMount({ getHTML });
		}
	});
</script>

<!-- Template 
::::::::::::::::::::::::::::::::::::::::::::: -->
<Component
	{...props}
	class="email {props.class}"
>
	{#snippet component({ props: componentProps })}
		<div {...componentProps}>
			{@html getHTML()}
		</div>
	{/snippet}
</Component>
